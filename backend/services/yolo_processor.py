import os
import cv2
import logging
from collections import deque

logger = logging.getLogger("yolo_processor")

class YoloVideoProcessor:
    def __init__(self, model_name: str = "yolov8n.pt"):
        self.model_name = model_name
        self._model = None

    @property
    def model(self):
        if self._model is None:
            from ultralytics import YOLO
            logger.info(f"Loading YOLO model: {self.model_name}")
            # This loads or automatically downloads the lightweight yolov8n model
            self._model = YOLO(self.model_name)
        return self._model

    def process_video(self, input_path: str, output_path: str) -> dict:
        """
        Process the video using YOLOv8, draw tracking boxes for players and trails for the ball.
        Save the output video as a browser-compatible H.264 MP4 using PyAV.
        """
        import av
        
        logger.info(f"YOLO processing started for: {input_path}")
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open input video: {input_path}")

        # Get video properties
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps    = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        logger.info(f"Video specs: {width}x{height} @ {fps}fps, total frames: {total_frames}")

        # Setup PyAV H.264 output container
        output_container = av.open(output_path, mode='w', format='mp4')
        stream = output_container.add_stream('h264', rate=fps)
        stream.width = width
        stream.height = height
        stream.pix_fmt = 'yuv420p'
        # Set high quality bitrate
        stream.bit_rate = 2000000 

        # Keep trace of ball trail (last 20 frames)
        ball_trail = deque(maxlen=20)
        
        # Stats
        max_players = 0
        ball_detected_count = 0
        processed_frames_count = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                processed_frames_count += 1
                
                # Run YOLO tracking on current frame
                # Classes: 0 is person, 32 is sports ball (soccer ball)
                results = self.model.track(
                    source=frame,
                    persist=True,
                    classes=[0, 32],
                    verbose=False,
                    tracker="bytetrack.yaml"
                )
                
                players_in_frame = 0
                ball_in_frame = None

                if results and len(results) > 0:
                    r = results[0]
                    boxes = r.boxes
                    
                    if boxes is not None:
                        # Extract classes, track IDs, and boxes
                        cls_list = boxes.cls.cpu().tolist() if boxes.cls is not None else []
                        xyxy_list = boxes.xyxy.cpu().tolist() if boxes.xyxy is not None else []
                        id_list = boxes.id.cpu().tolist() if boxes.id is not None else [None] * len(cls_list)

                        for cls, xyxy, tid in zip(cls_list, xyxy_list, id_list):
                            x1, y1, x2, y2 = map(int, xyxy)
                            tid_str = f"#{int(tid)}" if tid is not None else ""

                            if cls == 0:
                                # Person (Player)
                                players_in_frame += 1
                                # Draw violet box
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (237, 58, 124), 2)
                                # Label
                                cv2.putText(
                                    frame, f"Player {tid_str}", (x1, max(y1 - 5, 15)),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (237, 58, 124), 2
                                )
                            elif cls == 32:
                                # Sports Ball (Soccer Ball)
                                center_x = int((x1 + x2) / 2)
                                center_y = int((y1 + y2) / 2)
                                ball_in_frame = (center_x, center_y)
                                ball_detected_count += 1

                                # Draw yellow circle for ball
                                cv2.circle(frame, (center_x, center_y), 8, (0, 255, 255), -1)
                                cv2.putText(
                                    frame, "Ball", (x1, max(y1 - 5, 15)),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2
                                )

                # Update ball trail history
                if ball_in_frame:
                    ball_trail.append(ball_in_frame)
                
                # Draw ball movement trail lines
                if len(ball_trail) > 1:
                    for i in range(1, len(ball_trail)):
                        thickness = int(1 + (i / len(ball_trail)) * 3)
                        cv2.line(frame, ball_trail[i - 1], ball_trail[i], (0, 255, 255), thickness)

                # Keep track of max players in any frame
                if players_in_frame > max_players:
                    max_players = players_in_frame

                # Convert BGR (OpenCV) to RGB (PyAV/Standard)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Create PyAV video frame and encode
                av_frame = av.VideoFrame.from_ndarray(rgb_frame, format='rgb24')
                for packet in stream.encode(av_frame):
                    output_container.mux(packet)
                    
        finally:
            cap.release()
            
            # Flush PyAV encoders
            for packet in stream.encode():
                output_container.mux(packet)
            output_container.close()

        # Compile and return statistics
        ball_ratio = int((ball_detected_count / processed_frames_count) * 100) if processed_frames_count > 0 else 0
        
        stats = {
            "processed_frames": processed_frames_count,
            "max_players_detected": max_players,
            "ball_tracked_percentage": ball_ratio,
            "tactical_summary": f"تم تتبع {max_players} لاعباً والكرة بنسبة نجاح {ball_ratio}%."
        }
        logger.info(f"YOLO process finished. Stats: {stats}")
        return stats

# Instantiate single instance
yolo_processor = YoloVideoProcessor()

"""
video_tasks.py
──────────────
Background heavy-lifting for video analysis.
FastAPI calls `run_analysis_background()` as a BackgroundTask so the
HTTP response is returned to the coach IMMEDIATELY while YOLO + Gemini
process asynchronously in a thread pool.

Architecture:
  HTTP request  →  save record (status=processing)  →  return 202
                                                        ↘ background thread
                                                            Gemini + YOLO
                                                            DB update (status=done)
"""

import asyncio
import logging
import os
import tempfile

logger = logging.getLogger("video_tasks")


async def run_analysis_background(
    analysis_id: str,
    content: bytes,
    video_suffix: str,
    player_name: str,
    video_url: str,
    supabase_client,
    settings,
):
    """
    Full async pipeline: Gemini AI + YOLO tracking → DB update.
    Designed to run as a FastAPI BackgroundTask.
    """
    tmp_path = None
    yolo_output_path = None

    try:
        # ── Write to temp file ──────────────────────────────────────────
        with tempfile.NamedTemporaryFile(delete=False, suffix=video_suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # ── Gemini AI Analysis ──────────────────────────────────────────
        logger.info(f"[{analysis_id}] Starting Gemini analysis...")
        from routers.video_analysis import analyze_video_with_gemini
        analysis = await analyze_video_with_gemini(tmp_path, player_name)
        logger.info(f"[{analysis_id}] Gemini done: score={analysis.get('overall_score')}")

        # ── YOLO Tracking (CPU-bound → thread pool) ─────────────────────
        yolo_video_url = None
        yolo_stats = {}
        try:
            from services.yolo_processor import yolo_processor
            if yolo_processor:
                yolo_output_path = tmp_path.replace(video_suffix, f"_yolo{video_suffix}")
                logger.info(f"[{analysis_id}] Starting YOLO processing...")
                loop = asyncio.get_event_loop()
                yolo_stats = await loop.run_in_executor(
                    None,                        # default ThreadPoolExecutor
                    yolo_processor.process_video,
                    tmp_path,
                    yolo_output_path,
                )
                logger.info(f"[{analysis_id}] YOLO done: {yolo_stats}")

                # Upload annotated video
                if os.path.exists(yolo_output_path):
                    yolo_filename = f"yolo_output/{analysis_id}_yolo{video_suffix}"
                    with open(yolo_output_path, "rb") as yf:
                        yolo_content = yf.read()
                    yolo_video_url = await supabase_client.upload_file(
                        bucket="player-videos",
                        path=yolo_filename,
                        content=yolo_content,
                        content_type="video/mp4",
                    )
        except Exception as yolo_err:
            logger.warning(f"[{analysis_id}] YOLO failed (non-fatal): {yolo_err}")

        # ── Persist results ─────────────────────────────────────────────
        from datetime import datetime
        update_data = {
            "status": "done",
            "overall_score": analysis.get("overall_score"),
            "technical_score": analysis.get("technical_score"),
            "physical_score": analysis.get("physical_score"),
            "tactical_score": analysis.get("tactical_score"),
            "strengths": analysis.get("strengths", []),
            "improvements": analysis.get("improvements", []),
            "summary": analysis.get("summary", ""),
            "analyzed_at": datetime.utcnow().isoformat(),
            "yolo_video_url": yolo_video_url,
            "yolo_stats": yolo_stats if yolo_stats else {},
        }
        await supabase_client._patch(
            f"/rest/v1/player_video_analyses?id=eq.{analysis_id}",
            json=update_data,
        )
        logger.info(f"[{analysis_id}] ✅ Analysis complete — status=done")

    except Exception as e:
        logger.error(f"[{analysis_id}] ❌ Background analysis failed: {e}", exc_info=True)
        try:
            await supabase_client._patch(
                f"/rest/v1/player_video_analyses?id=eq.{analysis_id}",
                json={"status": "error"},
            )
        except Exception:
            pass

    finally:
        # Cleanup temp files
        for path in [tmp_path, yolo_output_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass

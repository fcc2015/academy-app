"""
Export router — CSV and PDF exports for players, finances, attendance.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from core.auth_middleware import verify_token
from fastapi.responses import StreamingResponse
from services.supabase_client import supabase
from typing import Optional
import csv
import io
from datetime import datetime

import logging
logger = logging.getLogger("exports")

router = APIRouter(prefix="/exports", tags=["Exports"], dependencies=[Depends(verify_token)])


@router.get("/players/csv")
async def export_players_csv():
    """Export all players as CSV."""
    try:
        players = await supabase.get_players()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Nom complet", "Catégorie", "Position", "Date de naissance",
                         "Parent", "Téléphone parent", "Statut", "Date d'inscription"])

        for p in players:
            writer.writerow([
                p.get("full_name", ""),
                p.get("category", ""),
                p.get("position", ""),
                p.get("birth_date", ""),
                p.get("parent_name", ""),
                p.get("parent_whatsapp", ""),
                p.get("status", ""),
                p.get("created_at", "")[:10] if p.get("created_at") else "",
            ])

        output.seek(0)
        filename = f"joueurs_{datetime.now().strftime('%Y%m%d')}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.get("/payments/csv")
async def export_payments_csv():
    """Export all payments as CSV."""
    try:
        payments = await supabase.get_payments()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Joueur", "Montant (MAD)", "Type", "Statut", "Méthode", "Date"])

        for p in payments:
            player_name = p.get("users", {}).get("full_name", "") if isinstance(p.get("users"), dict) else ""
            writer.writerow([
                player_name,
                p.get("amount", 0),
                p.get("payment_type", ""),
                p.get("status", ""),
                p.get("payment_method", ""),
                p.get("created_at", "")[:10] if p.get("created_at") else "",
            ])

        output.seek(0)
        filename = f"paiements_{datetime.now().strftime('%Y%m%d')}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.get("/attendance/csv")
async def export_attendance_csv(squad_id: Optional[str] = Query(None)):
    """Export attendance records as CSV."""
    try:
        # For now, return all attendance; can be filtered by squad
        if squad_id:
            # Get recent dates
            from datetime import date, timedelta
            today = date.today()
            records = []
            for i in range(30):
                d = (today - timedelta(days=i)).isoformat()
                day_records = await supabase.get_attendance(squad_id, d)
                records.extend(day_records)
        else:
            records = []

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Joueur", "Équipe", "Date", "Statut"])

        for r in records:
            player_name = ""
            if isinstance(r.get("players"), dict):
                users = r["players"].get("users", {})
                player_name = users.get("full_name", "") if isinstance(users, dict) else ""
            writer.writerow([
                player_name,
                r.get("squad_id", ""),
                r.get("date", ""),
                r.get("status", ""),
            ])

        output.seek(0)
        filename = f"presence_{datetime.now().strftime('%Y%m%d')}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error("Error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")

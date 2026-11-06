from typing import Optional, Dict
from sqlmodel import Session, select
from app.models.domain import Team, TeamAlias

class EntityResolver:
    """
    Resuelve nombres de equipos y alias de múltiples fuentes a su Team canónico.
    """
    def __init__(self, session: Session):
        self.session = session
        self._cache: Dict[str, str] = {} # (source, alias) -> team_id

    def resolve_team(self, alias_name: str, source_provider: str, sport_code: str = "FOOTBALL") -> Optional[Team]:
        clean_name = alias_name.strip()
        cache_key = f"{source_provider}::{clean_name.lower()}"
        if cache_key in self._cache:
            team_id = self._cache[cache_key]
            return self.session.get(Team, team_id)

        # 1. Buscar en team_aliases
        stmt = select(TeamAlias).where(
            TeamAlias.source_provider == source_provider,
            TeamAlias.alias_name.ilike(clean_name)
        )
        alias_record = self.session.exec(stmt).first()
        if alias_record:
            self._cache[cache_key] = alias_record.team_id
            return self.session.get(Team, alias_record.team_id)

        # 2. Buscar en canonical_name directo
        stmt_team = select(Team).where(
            Team.sport_code == sport_code,
            Team.canonical_name.ilike(clean_name)
        )
        team_record = self.session.exec(stmt_team).first()
        if team_record:
            # Registrar alias para acelerar futuras búsquedas
            new_alias = TeamAlias(
                team_id=team_record.id,
                source_provider=source_provider,
                alias_name=clean_name
            )
            self.session.add(new_alias)
            self.session.commit()
            self._cache[cache_key] = team_record.id
            return team_record

        return None

    def get_or_create_team(
        self,
        canonical_name: str,
        sport_code: str = "FOOTBALL",
        country: Optional[str] = None
    ) -> Team:
        stmt = select(Team).where(
            Team.sport_code == sport_code,
            Team.canonical_name == canonical_name
        )
        team = self.session.exec(stmt).first()
        if not team:
            team = Team(sport_code=sport_code, canonical_name=canonical_name, country=country)
            self.session.add(team)
            self.session.commit()
            self.session.refresh(team)
        return team

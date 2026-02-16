"""
Supabase Client Service
Uses Supabase REST API for database operations when direct PostgreSQL is not available
"""
import httpx
from typing import Optional, Dict, Any, List
from ..core.config import settings


class SupabaseClient:
    """Client for Supabase REST API"""
    
    def __init__(self):
        self.base_url = f"{settings.SUPABASE_URL}/rest/v1"
        self.headers = {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    async def _request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict:
        """Make HTTP request to Supabase"""
        url = f"{self.base_url}/{endpoint}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    json=data,
                    params=params
                )
                response.raise_for_status()
                return {"success": True, "data": response.json()}
            except httpx.HTTPStatusError as e:
                return {"success": False, "error": str(e), "status_code": e.response.status_code}
            except Exception as e:
                return {"success": False, "error": str(e)}
    
    # ===========================================
    # Generic CRUD operations
    # ===========================================
    
    async def select(
        self, 
        table: str, 
        columns: str = "*",
        filters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Select from table"""
        params = {"select": columns}
        
        if filters:
            for key, value in filters.items():
                params[key] = f"eq.{value}"
        
        if limit:
            params["limit"] = str(limit)
        
        return await self._request("GET", table, params=params)
    
    async def insert(self, table: str, data: Dict) -> Dict:
        """Insert into table"""
        return await self._request("POST", table, data=data)
    
    async def update(
        self, 
        table: str, 
        data: Dict, 
        filters: Dict[str, Any]
    ) -> Dict:
        """Update records in table"""
        params = {}
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        
        return await self._request("PATCH", table, data=data, params=params)
    
    async def delete(self, table: str, filters: Dict[str, Any]) -> Dict:
        """Delete from table"""
        params = {}
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        
        return await self._request("DELETE", table, params=params)
    
    # ===========================================
    # Table-specific methods
    # ===========================================
    
    async def get_clubs(self) -> List[Dict]:
        """Get all clubs"""
        result = await self.select("clubs")
        return result.get("data", []) if result.get("success") else []
    
    async def get_users(self, club_id: Optional[int] = None) -> List[Dict]:
        """Get users, optionally filtered by club"""
        filters = {"club_id": club_id} if club_id else None
        result = await self.select("users", filters=filters)
        return result.get("data", []) if result.get("success") else []
    
    async def get_user_by_phone(self, phone: str) -> Optional[Dict]:
        """Get user by phone number"""
        result = await self.select("users", filters={"phone": phone}, limit=1)
        data = result.get("data", [])
        return data[0] if data else None
    
    async def get_orders(
        self, 
        status_id: Optional[int] = None,
        club_id: Optional[int] = None,
        user_id: Optional[str] = None
    ) -> List[Dict]:
        """Get orders with optional filters"""
        filters = {}
        if status_id:
            filters["status_id"] = status_id
        if club_id:
            filters["club_id"] = club_id
        if user_id:
            filters["user_id"] = user_id
        
        result = await self.select("orders", filters=filters if filters else None)
        return result.get("data", []) if result.get("success") else []
    
    async def update_order_status(
        self, 
        order_id: str, 
        status_id: int,
        additional_data: Optional[Dict] = None
    ) -> Dict:
        """Update order status"""
        data = {"status_id": status_id}
        if additional_data:
            data.update(additional_data)
        
        return await self.update("orders", data, {"id": order_id})
    
    async def get_statuses(self) -> List[Dict]:
        """Get all status types"""
        result = await self.select("dim_status_types")
        return result.get("data", []) if result.get("success") else []
    
    async def get_subscriptions(self) -> List[Dict]:
        """Get all subscription types"""
        result = await self.select("dim_subscription_types")
        return result.get("data", []) if result.get("success") else []


# Singleton instance
supabase_client = SupabaseClient()

"""
Utility functions for FitClean API
"""
import random
import string
from datetime import datetime, timedelta
from typing import Optional


def generate_pin_code(length: int = 4) -> str:
    """Generate a random numeric PIN code"""
    return ''.join(random.choices(string.digits, k=length))


def generate_verification_code(length: int = 6) -> str:
    """Generate a random numeric verification code for SMS/WhatsApp"""
    return ''.join(random.choices(string.digits, k=length))


def generate_pickup_code() -> str:
    """Generate a 4-digit pickup code for order collection"""
    return ''.join(random.choices(string.digits, k=4))


def generate_order_number(club_code: str, date: Optional[datetime] = None, sequence: int = 1) -> str:
    """
    Generate enhanced order ID: YYYYMMDD-CLUB-SEQ
    
    Args:
        club_code: Club code (e.g., 'TEST', 'FCTD')
        date: Order date (defaults to today)
        sequence: Daily sequence number
        
    Returns:
        Order number string like '20260216-TEST-001'
    """
    if date is None:
        date = datetime.now()
    
    date_str = date.strftime("%Y%m%d")
    return f"{date_str}-{club_code.upper()}-{sequence:03d}"


def generate_bag_number(club_code: str, sequence: int) -> str:
    """
    Generate bag number for laundry tracking
    
    Args:
        club_code: Club code
        sequence: Bag sequence number
        
    Returns:
        Bag number like 'TEST-0458'
    """
    return f"{club_code.upper()}-{sequence:04d}"


def is_subscription_expiring(end_date: Optional[datetime], days_threshold: int = 7) -> bool:
    """Check if subscription is expiring within threshold"""
    if end_date is None:
        return False
    return end_date <= datetime.now() + timedelta(days=days_threshold)


def format_phone_number(phone: str, country_code: str = "7") -> str:
    """
    Format phone number to standard format
    Removes spaces, dashes, parentheses and ensures country code
    
    Args:
        phone: Phone number string
        country_code: Default country code (Kazakhstan = 7)
        
    Returns:
        Formatted phone like '77001234567'
    """
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    
    # Handle Kazakhstan numbers
    if digits.startswith('8') and len(digits) == 11:
        # Replace leading 8 with 7
        digits = '7' + digits[1:]
    elif len(digits) == 10:
        # Add country code
        digits = country_code + digits
    
    return digits

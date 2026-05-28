import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_seed = """
    dummy_docs = [
        {
            "vendor_name": "BigBasket",
            "category": "Groceries",
            "is_subscription": 0,
            "total_amount": 1250.0,
            "subtotal_amount": 1250.0,
            "tax_amount": 0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Aashirvaad Whole Wheat Atta 5kg", "quantity": 1, "unit_price": 250.0, "total_price": 250.0},
                {"description": "Amul Taaza Toned Milk 1L", "quantity": 2, "unit_price": 70.0, "total_price": 140.0},
                {"description": "Maggi 2-Minute Noodles 400g", "quantity": 3, "unit_price": 60.0, "total_price": 180.0},
                {"description": "Tata Salt 1kg", "quantity": 2, "unit_price": 28.0, "total_price": 56.0},
                {"description": "Fortune Sunlite Sunflower Oil 1L", "quantity": 4, "unit_price": 156.0, "total_price": 624.0}
            ],
            "invoice_date": "2026-05-20"
        },
        {
            "vendor_name": "Amazon India",
            "category": "Electronics",
            "is_subscription": 0,
            "total_amount": 54990.0,
            "subtotal_amount": 54990.0,
            "tax_amount": 0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Sony WH-1000XM5 Wireless Headphones", "quantity": 1, "unit_price": 29990.0, "total_price": 29990.0},
                {"description": "Logitech MX Master 3S Mouse", "quantity": 1, "unit_price": 9999.0, "total_price": 9999.0},
                {"description": "Keychron K2 Mechanical Keyboard", "quantity": 1, "unit_price": 8499.0, "total_price": 8499.0},
                {"description": "Anker 65W GaN Charger", "quantity": 2, "unit_price": 3251.0, "total_price": 6502.0}
            ],
            "invoice_date": "2026-05-22"
        },
        {
            "vendor_name": "Zomato",
            "category": "Dining",
            "is_subscription": 0,
            "total_amount": 1050.0,
            "subtotal_amount": 800.0,
            "tax_amount": 40.0,
            "tip_amount": 50.0,
            "misc_fees": 160.0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Paneer Butter Masala", "quantity": 2, "unit_price": 280.0, "total_price": 560.0},
                {"description": "Garlic Naan", "quantity": 4, "unit_price": 60.0, "total_price": 240.0}
            ],
            "invoice_date": "2026-05-25"
        },
        {
            "vendor_name": "Uber",
            "category": "Transport",
            "is_subscription": 0,
            "total_amount": 450.0,
            "subtotal_amount": 450.0,
            "tax_amount": 0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Uber Go: Airport to Home", "quantity": 1, "unit_price": 450.0, "total_price": 450.0}
            ],
            "invoice_date": "2026-05-26"
        },
        {
            "vendor_name": "Adobe",
            "category": "Software",
            "is_subscription": 1,
            "total_amount": 4230.0,
            "subtotal_amount": 4230.0,
            "tax_amount": 0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Creative Cloud All Apps - 1 Month", "quantity": 1, "unit_price": 4230.0, "total_price": 4230.0}
            ],
            "invoice_date": "2026-05-27"
        },
        {
            "vendor_name": "Netflix",
            "category": "Software",
            "is_subscription": 1,
            "total_amount": 649.0,
            "subtotal_amount": 649.0,
            "tax_amount": 0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Netflix Premium Plan - 1 Month", "quantity": 1, "unit_price": 649.0, "total_price": 649.0}
            ],
            "invoice_date": "2026-05-01"
        },
        {
            "vendor_name": "AWS",
            "category": "Software",
            "is_subscription": 1,
            "total_amount": 12500.0,
            "subtotal_amount": 11000.0,
            "tax_amount": 1500.0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "EC2 Instances Compute", "quantity": 1, "unit_price": 8000.0, "total_price": 8000.0},
                {"description": "RDS Database Hosting", "quantity": 1, "unit_price": 3000.0, "total_price": 3000.0}
            ],
            "invoice_date": "2026-05-05"
        },
        {
            "vendor_name": "Blinkit",
            "category": "Groceries",
            "is_subscription": 0,
            "total_amount": 320.0,
            "subtotal_amount": 300.0,
            "tax_amount": 0,
            "tip_amount": 10.0,
            "misc_fees": 10.0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Organic Whole Milk 1L", "quantity": 2, "unit_price": 85.0, "total_price": 170.0},
                {"description": "Brown Bread", "quantity": 1, "unit_price": 50.0, "total_price": 50.0},
                {"description": "Eggs 6 pcs", "quantity": 1, "unit_price": 80.0, "total_price": 80.0}
            ],
            "invoice_date": "2026-05-28"
        },
        {
            "vendor_name": "BSES Rajdhani Power",
            "category": "Utilities",
            "is_subscription": 0,
            "total_amount": 3450.0,
            "subtotal_amount": 3200.0,
            "tax_amount": 250.0,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "Electricity Bill - May 2026", "quantity": 1, "unit_price": 3200.0, "total_price": 3200.0}
            ],
            "invoice_date": "2026-05-10"
        },
        {
            "vendor_name": "Jio",
            "category": "Utilities",
            "is_subscription": 1,
            "total_amount": 999.0,
            "subtotal_amount": 846.6,
            "tax_amount": 152.4,
            "tip_amount": 0,
            "misc_fees": 0,
            "discount_amount": 0,
            "line_items": [
                {"description": "JioFiber Broadband Plan - 150Mbps", "quantity": 1, "unit_price": 846.6, "total_price": 846.6}
            ],
            "invoice_date": "2026-05-15"
        }
    ]
"""

content = re.sub(
    r'    dummy_docs = \[.*?\]\s+count = 0',
    new_seed.strip('\n') + '\n    \n    count = 0',
    content,
    flags=re.DOTALL
)

content = content.replace('is_subscription=0', 'is_subscription=d["is_subscription"]')

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Seed data updated.")

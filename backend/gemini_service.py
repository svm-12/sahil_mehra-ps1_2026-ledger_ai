import os
import re
import json
import base64
from google import genai
from google.genai import types
from dotenv import load_dotenv
from schemas import InvoiceExtraction

load_dotenv()

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def extract_invoice(self, raw_text: str = None, image_base64: str = None) -> InvoiceExtraction:
        if not self.is_configured():
            raise Exception("Gemini API Key is not configured.")

        prompt = """
        Extract the following fields from the provided invoice/receipt:
        - vendor_name (string)
        - total_amount (float)
        - invoice_date (string, format YYYY-MM-DD)
        - confidence_score (integer 0-100)
        - confidence_rationale (string explaining the score)
        
        Return ONLY valid JSON matching this schema.
        """
        
        contents = []
        if raw_text:
            contents.append(raw_text)
        if image_base64:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            image_bytes = base64.b64decode(image_base64)
            contents.append(
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg"
                )
            )
        contents.append(prompt)

        response = self.client.models.generate_content(
            model='gemini-1.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InvoiceExtraction,
            )
        )
        
        try:
            data = json.loads(response.text)
            return InvoiceExtraction(**data)
        except Exception as e:
            raise Exception(f"Failed to parse Gemini response: {str(e)}")

    def simulate_extraction(self, raw_text: str = None, image_base64: str = None) -> InvoiceExtraction:
        text_to_search = raw_text or ""
        vendor_match = re.search(r'(?i)store|merchant|vendor\s*#?\s*([a-z0-9]+)', text_to_search)
        total_match = re.search(r'(?i)total[\s:]*\$?(\d+\.\d{2})', text_to_search)
        
        vendor = vendor_match.group(1) if vendor_match else "Unknown Sandbox Vendor"
        total = float(total_match.group(1)) if total_match else 99.99
        
        return InvoiceExtraction(
            vendor_name=vendor,
            total_amount=total,
            invoice_date="2026-05-27",
            confidence_score=50,
            confidence_rationale="Simulated extraction using heuristic regex sandbox fallback."
        )

gemini_service = GeminiService()

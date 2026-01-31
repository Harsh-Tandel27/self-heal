import os
from playwright.async_api import async_playwright
from datetime import datetime
import uuid

EVIDENCE_DIR = "static/evidence"

class VisualVerifier:
    """
    Captures visual evidence of store state using Playwright.
    """
    
    def __init__(self):
        self.evidence_dir = EVIDENCE_DIR
        # Ensure evidence directory exists
        os.makedirs(self.evidence_dir, exist_ok=True)
        
    async def capture_evidence(self, url: str, label: str = "evidence") -> dict:
        """
        Navigates to a URL and takes a full-page screenshot.
        """
        filename = f"{label}_{uuid.uuid4().hex[:8]}.png"
        filepath = os.path.join(self.evidence_dir, filename)
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                # Set viewport for a good screenshot
                await page.set_viewport_size({"width": 1280, "height": 800})
                
                print(f"📸 Navigating to {url}...")
                await page.goto(url, wait_until="networkidle", timeout=10000)
                
                # Take screenshot
                await page.screenshot(path=filepath, full_page=True)
                print(f"✅ Screenshot saved: {filepath}")
                
                await browser.close()
                
                return {
                    "success": True,
                    "filepath": filepath,
                    "filename": filename,
                    "url": url,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            print(f"❌ Screenshot failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "url": url
            }

visual_verifier = VisualVerifier()

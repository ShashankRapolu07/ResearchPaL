import fitz

def parse_pdf(pdf_path: str) -> str:
    pdf_text = ""
    with fitz.open(pdf_path) as doc:
        for page in doc:
            pdf_text += page.get_text()
    return pdf_text
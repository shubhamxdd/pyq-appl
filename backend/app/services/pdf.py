import io
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from typing import List, Dict, Any
import os

# Set up Jinja2 environment
template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
env = Environment(loader=FileSystemLoader(template_dir), autoescape=True)

def map_option_letter(index: str) -> str:
    """Helper to map 0, 1, 2, 3 to A, B, C, D"""
    return chr(65 + int(index))

env.filters['map_option_letter'] = map_option_letter

async def generate_paper_pdf(
    title: str,
    questions: List[Dict[str, Any]],
    format_config: Dict[str, Any],
    include_answers: bool = False,
    include_explanations: bool = False
) -> io.BytesIO:
    """
    Generates a PDF from a list of questions and returns a BytesIO object.
    """
    # Group questions by type for sections
    mcqs = [q for q in questions if q.get('type') == 'mcq']
    shorts = [q for q in questions if q.get('type') == 'short']
    longs = [q for q in questions if q.get('type') == 'long']

    sections = []
    if mcqs:
        sections.append({"name": "Section A: Multiple Choice Questions", "questions": mcqs})
    if shorts:
        sections.append({"name": "Section B: Short Answer Questions", "questions": shorts})
    if longs:
        sections.append({"name": "Section C: Long Answer Questions", "questions": longs})

    # Render HTML
    template = env.get_template("paper.html")
    html_content = template.render(
        title=title,
        total_marks=format_config.get('total_marks', 'N/A'),
        duration=format_config.get('duration_minutes', 'N/A'),
        sections=sections,
        include_answers=include_answers,
        include_explanations=include_explanations
    )

    # Convert to PDF
    pdf_output = io.BytesIO()
    HTML(string=html_content).write_pdf(pdf_output)
    pdf_output.seek(0)
    
    return pdf_output

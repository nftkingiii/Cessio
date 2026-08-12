from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
LOGO = ROOT / "public" / "brand" / "cessio-logo.png"
OUT.mkdir(parents=True, exist_ok=True)

INK = colors.HexColor("#101211")
PANEL = colors.HexColor("#171A18")
LINE = colors.HexColor("#303631")
MUTED = colors.HexColor("#879188")
PAPER = colors.HexColor("#F3F6F1")
SIGNAL = colors.HexColor("#9BED63")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=36, leading=37, textColor=PAPER, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["BodyText"], fontName="Helvetica", fontSize=15, leading=21, textColor=colors.HexColor("#C8D0C8"), spaceAfter=20))
styles.add(ParagraphStyle(name="H1C", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=23, leading=26, textColor=PAPER, spaceBefore=6, spaceAfter=12))
styles.add(ParagraphStyle(name="H2C", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=SIGNAL, spaceBefore=8, spaceAfter=6))
styles.add(ParagraphStyle(name="BodyC", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=16, textColor=colors.HexColor("#CAD1CA"), spaceAfter=9))
styles.add(ParagraphStyle(name="SmallC", parent=styles["BodyText"], fontName="Courier", fontSize=8.2, leading=11, textColor=colors.HexColor("#B9C2B9"), spaceAfter=5))
styles.add(ParagraphStyle(name="LabelC", parent=styles["BodyText"], fontName="Courier-Bold", fontSize=8.5, leading=11, textColor=SIGNAL, spaceAfter=5))


def link(url, label=None):
    text = label or url
    return f'<link href="{url}" color="#9BED63"><u>{text}</u></link>'


def page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.rect(0, 0, doc.pagesize[0], doc.pagesize[1], fill=1, stroke=0)
    canvas.setStrokeColor(LINE)
    canvas.line(doc.leftMargin, 18 * mm, doc.pagesize[0] - doc.rightMargin, 18 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Courier", 8)
    canvas.drawString(doc.leftMargin, 11 * mm, "CESSIO / BOT CHAIN TESTNET / 968")
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 11 * mm, f"{doc.page}")
    canvas.restoreState()


def table(rows, widths):
    rendered_rows = []
    for row in rows:
        rendered = []
        for cell in row:
            if isinstance(cell, str):
                rendered.append(Paragraph(cell, styles["SmallC"]))
            else:
                rendered.append(cell)
        rendered_rows.append(rendered)
    t = Table(rendered_rows, colWidths=widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PANEL),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#CAD1CA")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LEADING", (0, 0), (-1, -1), 13),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def make_pitch():
    path = OUT / "cessio-pitch-deck.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=20 * mm, bottomMargin=24 * mm, title="Cessio - BOT Chain Project Brief")
    story = []
    story += [Spacer(1, 18 * mm), Image(str(LOGO), width=30 * mm, height=30 * mm), Spacer(1, 10 * mm)]
    story += [Paragraph("Cessio", styles["CoverTitle"]), Paragraph("Capital, backed by proof.", styles["CoverSub"])]
    story += [Paragraph("An AI-underwritten receivables market for compute and digital-service invoices, with settlement evidence recorded on BOT Chain.", styles["BodyC"]), Spacer(1, 22 * mm)]
    story += [Paragraph("PROJECT BRIEF", styles["LabelC"]), Paragraph("BOT Chain Builder Challenge 2 / Testnet submission", styles["SmallC"]), Paragraph(link("https://cessio.up.railway.app", "Live application"), styles["SmallC"]), PageBreak()]

    story += [Paragraph("The problem", styles["H1C"]), Paragraph("Small compute providers and digital-service teams often wait weeks to be paid for completed work. Investors lack a compact, inspectable way to evaluate delivery evidence, repayment terms, and settlement state before funding an invoice.", styles["BodyC"])]
    story += [Paragraph("The product", styles["H1C"]), Paragraph("Cessio turns a service invoice into a risk-scored receivable. The product combines evidence-aware underwriting, a funding workflow, and a chain-backed lifecycle: assess, issue, fund, repay, and claim.", styles["BodyC"])]
    story += [Paragraph("What the AI does", styles["H2C"]), Paragraph("The underwriting layer evaluates structured invoice metadata and delivery evidence, applies bounded policy rules, and returns a normalized approval or review decision. AI is used for an asset-level business decision, not as a chat-only interface.", styles["BodyC"])]
    story += [Paragraph("Settlement lifecycle", styles["H2C"]), table([["01", "02", "03", "04", "05"], ["Assess", "Issue", "Fund", "Repay", "Claim"]], [30 * mm] * 5), Spacer(1, 12 * mm)]
    story += [Paragraph("Current state", styles["H2C"]), Paragraph("A live Testnet DApp reads a completed receipt directly through the Cessio backend and exposes verified contract links, wallet connection, and a clear settlement state.", styles["BodyC"]), PageBreak()]

    story += [Paragraph("BOT Chain integration", styles["H1C"]), Paragraph("Cessio is deployed on BOT Chain Testnet, chain ID 968, using the BOT RPC and BOTScan explorer. The contracts are source-verified and the lifecycle has been exercised end to end.", styles["BodyC"])]
    story += [table([["Component", "Address"], ["CessioReceivables", "0x212d99C7fC7C83901e8d6BB0F82d937F9735d248"], ["MockUSDT / cUSDT", "0x4D0984B958b4376dE072DC098404c4afA9155C90"], ["Chain", "BOT Chain Testnet / 968"]], [45 * mm, 125 * mm]), Spacer(1, 10 * mm)]
    story += [Paragraph("Proof surface", styles["H2C"]), Paragraph(link("https://scan.bohr.life/address/0x212d99C7fC7C83901e8d6BB0F82d937F9735d248", "Verified receivables contract"), styles["SmallC"]), Paragraph(link("https://scan.bohr.life/tx/0xc9ee384ea1004ca2c10a4c9ef2659c2d44c7631156ac66f8b3f20af249219186", "Claim transaction"), styles["SmallC"]), Paragraph(link("https://github.com/nftkingiii/Cessio", "Public source repository"), styles["SmallC"]), Spacer(1, 8 * mm)]
    story += [Paragraph("Roadmap", styles["H2C"]), Paragraph("Mainnet deployment after BOT Chain support approval; wallet-signature authentication; managed PostgreSQL persistence; open-receivable creation; originator and investor dashboards; and design-partner validation with compute providers.", styles["BodyC"])]
    story += [Paragraph("Official channels", styles["H2C"]), Paragraph(link("https://x.com/cessioapp", "X: @cessioapp"), styles["SmallC"]), Paragraph("Telegram: NFTKINGII", styles["SmallC"]), PageBreak()]

    story += [Paragraph("Why Cessio", styles["H1C"]), Paragraph("Cessio makes an otherwise opaque credit decision legible. Each funding decision is paired with evidence references, policy outputs, and a settlement record that can be independently checked on-chain.", styles["BodyC"])]
    story += [Paragraph("Submission contacts", styles["H2C"]), table([["Website", link("https://cessio.up.railway.app")], ["Repository", link("https://github.com/nftkingiii/Cessio")], ["X", link("https://x.com/cessioapp")], ["Telegram", "NFTKINGII"], ["Receiving wallet", "0x89fa09831c33A9651dA38aC37B25E058B6409Cc8"]], [38 * mm, 132 * mm]), Spacer(1, 18 * mm)]
    story += [Paragraph("Cessio is currently Testnet Live. Mainnet claims are intentionally not presented as completed.", styles["BodyC"])]
    doc.build(story, onFirstPage=page, onLaterPages=page)
    return path


def make_evidence():
    path = OUT / "cessio-onchain-evidence.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=landscape(A4), rightMargin=14 * mm, leftMargin=14 * mm, topMargin=16 * mm, bottomMargin=22 * mm, title="Cessio - BOT Chain On-chain Evidence")
    story = [Paragraph("Cessio / On-chain interaction evidence", styles["H1C"]), Paragraph("BOT Chain Testnet, chain ID 968. Prepared for the BOT Chain Ecosystem Support application.", styles["BodyC"])]
    story += [table([["Item", "Evidence"], ["Live DApp", link("https://cessio.up.railway.app")], ["CessioReceivables", link("https://scan.bohr.life/address/0x212d99C7fC7C83901e8d6BB0F82d937F9735d248")], ["MockUSDT", link("https://scan.bohr.life/address/0x4D0984B958b4376dE072DC098404c4afA9155C90")], ["Deploy CessioReceivables", link("https://scan.bohr.life/tx/0xd1044c3ae6e110462ceb0851c121d7d895591d6b9184e113e7c9d6a38d4917ce")], ["Mint", link("https://scan.bohr.life/tx/0x933c750179f705383e598309555f7ba577224c2baf7630c5eb74a11cf213adc0")], ["Create receivable", link("https://scan.bohr.life/tx/0x7dce3dc96ec96195877547a299e71ab20d117b40c12c65c09e44d33af41c0b17")], ["Fund", link("https://scan.bohr.life/tx/0x14935a3db3e5fb093f8f23e8a8fd1781ebf4d65c8caf4d6c6d4167e34a50f4ee")], ["Repay", link("https://scan.bohr.life/tx/0xd87dfee7c77ef0d81278ad3ef1fa91475aaab4484a07e7c9d0b1a3a975d8252a")], ["Claim", link("https://scan.bohr.life/tx/0xc9ee384ea1004ca2c10a4c9ef2659c2d44c7631156ac66f8b3f20af249219186")]], [48 * mm, 222 * mm]), Spacer(1, 10 * mm)]
    story += [Paragraph("RPC read-back", styles["H2C"]), Paragraph("Receipt #1: status Repaid; principal funded 100 cUSDT; repayment 105 cUSDT; total funded 100 cUSDT; claim recorded by the wallet; contract balance returned to zero after settlement.", styles["BodyC"]), Paragraph("Deployer / underwriter / demo wallet: 0x89fa09831c33A9651dA38aC37B25E058B6409Cc8", styles["SmallC"]), Paragraph(link("https://github.com/nftkingiii/Cessio", "Source and deployment context"), styles["SmallC"])]
    doc.build(story, onFirstPage=page, onLaterPages=page)
    return path


print(make_pitch())
print(make_evidence())

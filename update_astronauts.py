import csv, json, re, urllib.request
from collections import defaultdict
from pathlib import Path

ASTRO="https://planet4589.org/space/astro/tsv/astro.tsv"
RIDES="https://planet4589.org/space/astro/tsv/rides.tsv"

COUNTRIES={"US":"USA","RU":"Russia","SU":"USSR","CA":"Canada","UK":"United Kingdom","GB":"United Kingdom","D":"Germany","F":"France","I":"Italy","J":"Japan","CN":"China","UAE":"United Arab Emirates","S":"Sweden","N":"Norway","E":"Spain","PL":"Poland","HU":"Hungary","IN":"India","AU":"Australia","NZ":"New Zealand","BY":"Belarus","KZ":"Kazakhstan","UA":"Ukraine","SA":"Saudi Arabia","TR":"Turkey","BR":"Brazil","MX":"Mexico","PT":"Portugal","EG":"Egypt","IL":"Israel"}

def download(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Astrodle data updater"})
    return urllib.request.urlopen(req,timeout=60).read().decode("utf-8")

def rows(text):
    return list(csv.DictReader((x for x in text.splitlines() if x.strip() and not x.lstrip().startswith("#")),delimiter="\t"))

def val(row,*keys):
    for k in keys:
        if k in row:return (row[k] or "").strip()
    return ""

def name(raw):
    raw=raw.replace("*","").strip()
    if "," in raw:
        p=[x.strip() for x in raw.split(",")]
        return " ".join(p[1:]+p[:1])
    return raw

def year(ride):
    m=re.search(r"\b(19|20)\d{2}\b",val(ride,"LDate"))
    return int(m.group()) if m else 0

def agency(ride,yr,nat):
    s=" ".join(val(ride,k).upper() for k in ("Sponsor","Employer","Program","Progra"))
    if "NASA" in s:return "NASA"
    if "ESA" in s:return "ESA"
    if any(x in s for x in ("JAXA","NASDA")):return "JAXA"
    if "CSA" in s:return "CSA"
    if any(x in s for x in ("CNSA","CMSA","HYD")):return "CNSA"
    if "ISRO" in s:return "ISRO"
    if any(x in s for x in ("ROSCOSMOS","ROSKOSMOS","TSPK")):return "Soviet Space Program" if yr<1992 else "Roscosmos"
    if any(x in s for x in ("SPACEX","SPX")):return "SpaceX"
    if any(x in s for x in ("BLUE ORIGIN","BLOR")):return "Blue Origin"
    if any(x in s for x in ("VIRGIN GALACTIC","VGX")):return "Virgin Galactic"
    if "AXIOM" in s:return "Axiom Space"
    if nat=="China":return "CNSA"
    if nat in ("Russia","USSR"):return "Soviet Space Program" if yr<1992 else "Roscosmos"
    return val(ride,"Sponsor") or val(ride,"Employer") or "Independent / Commercial"

astro=rows(download(ASTRO)); rides=rows(download(RIDES))
first={}
for r in rides:
    i=val(r,"ID")
    if not i.startswith("AS-"):continue
    if i not in first or year(r)<year(first[i]):first[i]=r

out=[]
for a in astro:
    i=val(a,"No")
    if not i.startswith("AS-"):continue
    r=first.get(i,{})
    y=year(r)
    if not y:continue
    code=val(a,"Citizen").split()[0]
    nat=COUNTRIES.get(code,code)
    g=val(a,"G").upper()
    out.append({"name":name(val(a,"Name")),"nationality":nat,"gender":"Female" if g=="F" else "Male" if g=="M" else "Other","firstFlight":y,"missions":int(val(a,"NFL") or 1),"agency":agency(r,y,nat)})

out.sort(key=lambda x:x["name"])
Path("astronauts.json").write_text(json.dumps(out,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print("Wrote",len(out),"astronauts")

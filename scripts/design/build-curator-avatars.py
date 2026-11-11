#!/usr/bin/env python3
"""Spoonie editorial-character portraits. Original SVG art; no national flags, fake photos, or text."""
from pathlib import Path
from html import escape
from xml.etree import ElementTree
from collections import Counter

DEST=Path(__file__).resolve().parents[2]/'public'/'curator-avatars'
# code, backdrop, contrast, skin, hair, tunic, hair shape, token, accent, expression
SPECS=[
 ('bori','#f8dfbc','#edb36b','#edbd94','#382923','#9b603a','soft-bun','bowl','#b47c48','warm'),
 ('momo','#dce8df','#abcbbb','#f7cbac','#27272b','#687d75','bob','bowl','#946e8c','calm'),
 ('lin','#ffd6cd','#efa49a','#eeb393','#262126','#b64248','twin-bun','steam','#e9af66','bright'),
 ('luca','#f2dfbb','#d5ba7c','#ebc1a3','#53372b','#708b4d','curly','pasta','#d2824e','bright'),
 ('sol','#f9deca','#eba78c','#eed0b3','#654028','#be7957','beret','plate','#db9c60','warm'),
 ('nur','#e4dcec','#bca4d4','#b88462','#211e2a','#786f96','wrap','spice','#dfb56b','calm'),
 ('max','#dcebf4','#9ec7d6','#e8b38e','#b67a42','#466b83','short','grill','#f0a95c','bright'),
 ('nico','#ddede1','#b0d0ad','#e6b892','#2b2a24','#567d6a','wavy','lemon','#e8bb6b','warm'),
 ('maya','#f9d8bb','#edb477','#bf825f','#28201e','#cc765b','bandana','chili','#e3a75b','bright'),
 ('tori','#e7e0f7','#c2b0e4','#f0bc9d','#4b385a','#8676ac','asymmetric','spark','#e0ab65','quirky'),
 ('milli','#f2d6df','#d9a4b7','#ead1bb','#4e3432','#9a6472','glasses','whisk','#e8ad7d','calm'),
 ('lulu','#fbe2d2','#eabaae','#f5ccaf','#9a6a4b','#b47b89','long','cake','#ebac89','warm'),
 ('danbi','#f4e6cf','#d9c3a4','#edbea1','#352825','#8b7658','ribbon','ricecake','#dfb979','warm'),
 ('popo','#d8ebf3','#9fc5da','#f0bca9','#7199b1','#789ab7','twintails','icecream','#e5a1bc','bright'),
 ('jay','#ece4de','#c3b9b0','#d9a17e','#272a2e','#5b515a','slick','glass','#c29373','calm'),
 ('bean','#e8ded4','#c2a691','#dfb594','#342b27','#6b584b','headphones','coffee','#b78565','quirky'),
 ('yuja','#e3edd1','#b5c79f','#f1c39d','#43352d','#7b9368','strawhat','tea','#e4bb64','warm'),
 ('peach','#fbe1e1','#eeb6bf','#edc09e','#7c514f','#e19ca1','swept','fruit','#e9ac69','bright'),
]

def p(d,fill,stroke='none',width=0,extra=''):
 return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def circle(x,y,r,fill,extra=''):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" {extra}/>'
def ellipse(x,y,rx,ry,fill,extra=''):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'
def hair_back(style,hair):
 if style in ('long','bob','wavy','asymmetric','twintails'):
  return p('M 92 172 C 67 109 84 69 130 67 C 177 46 231 70 236 146 L 243 245 Q 211 257 207 218 Q 192 247 182 249 L 117 240 Q 99 255 80 236 Z',hair,'#48342b',2)
 if style in ('twin-bun','twintails'):
  return circle(87,108,29,hair)+circle(237,108,29,hair)+p('M90 198 Q61 117 118 74 Q157 50 204 76 Q248 112 233 204Z',hair)
 if style=='soft-bun':
  return circle(104,83,32,hair)+p('M88 188Q65 80 143 69Q233 55 236 178L222 239L101 237Z',hair)
 if style=='curly':
  return ''.join(circle(cx,cy,29 if j%2 else 26,hair) for j,(cx,cy) in enumerate([(105,104),(127,73),(159,65),(197,76),(225,109),(94,139),(227,144)]))
 if style=='wrap':
  return p('M83 145Q73 81 158 73Q250 67 238 156L224 226Q184 248 109 223Z',hair)
 if style=='ribbon':
  return p('M82 159Q86 77 155 66Q232 64 237 162L224 244L93 247Z',hair)
 if style=='headphones':
  return p('M88 155Q74 77 153 67Q239 66 234 158L226 226L95 225Z',hair)
 return p('M85 156Q78 65 157 67Q248 68 237 169L222 209L98 202Z',hair,'#4d3630',1.8)

def hair_front(style,hair):
 if style=='curly':
  return ''.join(circle(cx,cy,22 if j%2 else 25,hair) for j,(cx,cy) in enumerate([(99,108),(117,82),(145,73),(175,77),(199,89),(218,116)]))+p('M97 109Q121 87 144 110Q181 79 214 118L207 93L107 88Z',hair)
 if style=='soft-bun':
  return p('M99 152C91 89 113 76 153 79Q179 77 213 101Q225 121 220 145Q176 125 161 108Q137 152 99 152Z',hair)
 if style=='bob':return p('M95 140Q93 83 147 78Q206 67 222 125Q184 114 167 91Q146 132 103 139Z',hair)
 if style=='twin-bun':return p('M103 138Q102 84 153 80Q188 78 217 120Q186 124 160 102Q149 132 115 140Z',hair)
 if style=='wavy':return p('M92 139Q80 86 133 79Q173 63 202 94Q228 113 223 143Q181 117 164 95Q150 131 92 139Z',hair)
 if style=='beret':return p('M103 146Q94 102 139 92Q202 72 222 132Q185 137 153 112Q133 141 103 146Z',hair)
 if style=='short':return p('M96 137Q87 100 126 82Q188 62 220 100L224 132Q199 112 178 113L164 99Q145 132 96 137Z',hair)
 if style=='wrap':return p('M105 146Q103 120 127 112Q156 111 169 124L220 124L220 144Q201 156 190 124Q144 151 105 146Z',hair)
 if style=='bandana':return p('M102 141Q96 106 142 96Q199 84 219 133Q174 129 160 113Q130 138 102 141Z',hair)
 if style=='asymmetric':return p('M95 132Q93 80 155 72Q229 69 225 141L192 124Q185 151 156 153Q174 104 155 106Q133 135 95 132Z',hair)
 if style=='glasses':return p('M98 149Q84 89 142 81Q198 71 224 136Q195 120 181 112Q165 131 128 135Q117 143 98 149Z',hair)
 if style=='long':return p('M94 143Q94 74 155 70Q218 65 227 145Q200 119 188 112Q164 156 112 143Z',hair)
 if style=='ribbon':return p('M99 145Q84 89 151 76Q221 72 220 140Q183 109 160 102Q143 141 99 145Z',hair)
 if style=='twintails':return p('M96 145Q101 89 159 78Q212 72 220 143Q189 122 175 102Q152 142 96 145Z',hair)
 if style=='slick':return p('M99 129Q96 101 143 82Q193 67 220 104Q193 108 164 108Q133 130 99 129Z',hair)
 if style=='headphones':return p('M95 142Q87 84 151 78Q207 72 220 138Q174 105 154 105Q127 135 95 142Z',hair)
 if style=='strawhat':return p('M97 144Q92 106 132 100Q178 88 214 134Q171 120 149 104Q122 139 97 144Z',hair)
 if style=='swept':return p('M103 143Q90 99 129 78Q179 59 219 123Q187 107 173 92Q149 139 103 143Z',hair)
 return p('M101 137Q85 93 145 77Q206 73 220 128Q173 107 154 101Q133 135 101 137Z',hair)

def adornment(style,accent,ink):
 s=''
 if style=='beret':
  s+=p('M99 96 Q120 49 180 48 Q222 50 231 97 Q191 104 149 89 Q117 108 99 96Z',accent,ink,2)
  s+=p('M127 102Q180 112 220 101','none',ink,2)
 if style=='wrap':
  s+=p('M85 128Q94 64 146 61Q218 52 239 113Q195 95 168 94Q127 115 85 128Z',accent,ink,2.7)
  s+=p('M101 110Q144 68 196 93','none','#f5e6b7',5)
 if style=='bandana':
  s+=p('M88 121Q109 76 155 78Q207 80 234 129L228 144Q176 114 145 116Q120 119 88 142Z',accent,ink,2.8)
  s+=circle(101,130,5,'#fff1d2')+circle(126,109,4,'#fff1d2')+circle(198,117,4,'#fff1d2')
 if style=='strawhat':
  s+=ellipse(158,101,92,20,accent, 'stroke="#886d4b" stroke-width="2"')
  s+=p('M111 103Q110 46 156 44Q205 46 211 103Z','#dfc8a0','#886d4b',2.4)
  s+=p('M117 95Q168 113 206 97','none','#73936a',9)
 if style=='headphones':
  s+=p('M93 177Q69 76 160 68Q245 75 230 177','none','#40444b',11)
  s+=p('M99 150Q82 148 82 180Q84 202 102 195Z','#56555b','#25252a',3)
  s+=p('M221 150Q240 148 240 180Q238 202 220 195Z','#56555b','#25252a',3)
 if style=='ribbon':
  s+=p('M216 104 Q228 71 251 83 Q245 104 227 110 Q251 119 247 134 Q223 138 213 109Z',accent,ink,2)
  s+=circle(221,109,8,'#fff1e4')
 if style=='glasses':
  s+=circle(133,163,21,'none','stroke="#393230" stroke-width="4"')
  s+=circle(187,163,21,'none','stroke="#393230" stroke-width="4"')
  s+=p('M154 161Q161 158 166 161','none','#393230',3)
 if style=='twin-bun':
  s+=p('M95 107l-23 -18 3 25 -20 10 28 4Z',accent)
  s+=p('M219 104l20 -22 -1 28 20 10 -28 4Z',accent)
 if style=='twintails':
  s+=p('M95 118Q64 114 65 131Q75 145 96 129Z',accent)
  s+=p('M221 118Q249 112 255 130Q245 144 224 129Z',accent)
 if style=='soft-bun':
  s+=circle(104,76,10,accent)
 if style=='asymmetric':
  s+=p('M210 113l6 -20 6 21 22 8 -21 7 -6 21 -7 -20 -20 -8Z','#f5d073')
 return s

def token_icon(kind,accent):
 # cheerful small food motifs in a pale disc, no text
 ink='#5b463e'; s=circle(255,241,36,'#fffbf4','opacity=".94" stroke="#ffffff" stroke-width="3"')
 if kind in ('bowl','spice','ricecake','pasta','plate'):
  s+=ellipse(255,237,28,8,accent,'opacity=".75"')+p('M227 240Q232 265 255 266Q279 266 283 240Z','#fff4d9',ink,3)
  s+=p('M229 241Q257 250 282 241','none',ink,2)
  if kind=='pasta':s+=p('M238 234Q243 222 249 230T263 231Q273 224 275 235','none','#cc7c42',3.8)
  if kind=='spice':s+=circle(246,231,3,'#bf693b')+circle(257,228,3,'#bf693b')+circle(267,233,3,'#bf693b')
  if kind=='ricecake':s+=circle(244,230,5,'#fcf0dc')+circle(255,227,5,'#fcf0dc')+circle(266,230,5,'#fcf0dc')
  if kind=='plate':s+=circle(255,238,9,'#d47d55')+circle(245,238,5,'#97a85b')
 elif kind in ('tea','coffee'):
  s+=p('M238 223L238 255Q253 264 271 255L271 223Z','#fbf8ee',ink,3)
  s+=p('M272 230Q290 227 287 243Q285 251 272 247','none',ink,4)
  s+=ellipse(255,225,16,5,'#9b663f' if kind=='coffee' else '#b9a06c')
  s+=p('M245 213Q238 206 244 197M260 216Q267 206 261 199','none','#aea6a1',2.3)
 elif kind=='glass':
  s+=p('M237 224L273 224L260 245L250 245Z','#e8ae84',ink,2.8)+p('M255 245L255 261M244 263L267 263','none',ink,3)
 elif kind=='grill':
  s+=p('M234 230L272 249M238 251L269 224','none',ink,5)+p('M240 221L271 254','none','#ba7958',3)
 elif kind=='whisk':
  s+=p('M235 227Q240 207 253 234Q266 207 270 226Q271 240 252 243Q232 243 235 227Z','none',ink,3)
  s+=p('M252 242L264 263','none',ink,4)
 elif kind in ('cake','icecream','fruit'):
  if kind=='cake':
   s+=p('M231 251L270 251L264 229L234 229Z','#ef9da9',ink,2)
   s+=p('M230 229Q250 213 266 228','none','#fff8ed',5)+circle(254,219,5,'#bd565d')
  if kind=='icecream':
   s+=p('M243 238L267 238L256 268Z','#d5a074',ink,2)+circle(254,224,15,'#f2b1c9')+circle(243,231,12,'#bedbde')
  if kind=='fruit':
   s+=circle(255,241,16,'#e8a47b','stroke="#ab6757" stroke-width="2"')+p('M255 224Q254 209 270 213Q264 224 255 225Z','#91aa6b')
 elif kind=='lemon':
  s+=ellipse(255,239,23,15,'#efce6f','stroke="#bc9a4c" stroke-width="2.5"')
  s+=p('M240 238L268 240M255 225L255 252','none','#fff3cf',2.3)
 elif kind=='chili':
  s+=p('M230 239Q241 212 276 228Q262 261 231 251Z','#d45b4c',ink,2)
  s+=p('M256 225Q251 213 264 210','none','#699566',4)
 elif kind=='spark':
  s+=p('M255 213L261 235L283 242L261 248L255 269L249 248L227 242L249 235Z',accent,ink,1.6)
 elif kind=='steam':
  s+=p('M232 254L278 254L268 263L241 263Z',accent,ink,2)+p('M242 240Q235 232 245 223M256 239Q246 233 258 219M268 240Q264 232 274 222','none',ink,2.3)
 return s

def portrait(spec):
 code,bg,shade,skin,hair,shirt,style,token,accent,expression=spec
 ink='#49382f'; s=[]
 s.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320" role="img" aria-label="Spoonie 큐레이터 캐릭터 일러스트">')
 s.append(f'<defs><linearGradient id="bg" x2=".95" y2=".95"><stop stop-color="{bg}"/><stop offset="1" stop-color="{shade}"/></linearGradient><clipPath id="rim"><circle cx="160" cy="160" r="154"/></clipPath></defs>')
 s.append(circle(160,160,157,'url(#bg)'))
 s.append('<g clip-path="url(#rim)">')
 s.append(circle(55,69,90,'#fffdf8','opacity=".24"')+circle(285,286,80,'#fffdf8','opacity=".19"'))
 s.append(p('M-10 278Q73 224 144 273T324 265L333 337L-15 335Z','#ffffff',extra='opacity=".25"'))
 s.append(circle(265,82,7,'#fffaf3','opacity=".55"')+circle(55,195,5,'#fffaf3','opacity=".7"'))
 s.append(hair_back(style,hair))
 # costume behind face, shoulders, neck
 s.append(p('M46 329Q51 258 105 249Q133 244 142 225L179 225Q191 244 216 249Q267 258 276 329Z',shirt,ink,3))
 s.append(p('M134 232Q144 249 163 246Q181 248 190 230L187 206L137 206Z',skin,ink,2.6))
 s.append(p('M117 246L157 269L196 246','none','#fff9ef',5))
 s.append(p('M139 266L139 325L188 325L188 266Q165 284 139 266Z','#fff9ef',extra='opacity=".65"'))
 # earrings/ears
 s.append(ellipse(101,165,13,19,skin,f'stroke="{ink}" stroke-width="2.8"'))
 s.append(ellipse(221,165,13,19,skin,f'stroke="{ink}" stroke-width="2.8"'))
 # face
 s.append(ellipse(161,156,65,75,skin,f'stroke="{ink}" stroke-width="2.8"'))
 s.append(ellipse(123,178,13,8,'#eaa29b','opacity=".28"')+ellipse(204,179,13,8,'#eaa29b','opacity=".28"'))
 s.append(p('M153 166Q147 173 155 178','none',ink,2.3,'opacity=".55"'))
 # eyes
 if expression in ('warm','bright'):
  s.append(p('M121 158Q133 146 143 159','none',ink,4.1))
  s.append(p('M177 158Q189 146 201 158','none',ink,4.1))
 else:
  s.append(p('M121 157Q132 156 141 157','none',ink,4.2))
  s.append(p('M179 157Q188 155 199 158','none',ink,4.2))
  s.append(circle(133,158,3.9,ink)+circle(189,158,3.9,ink))
 s.append(p('M120 136Q132 129 143 134M179 134Q189 129 201 136','none',hair,3.3))
 if expression=='bright':
  s.append(p('M140 190Q162 213 185 190Q160 200 140 190Z','#9a5050',ink,1.7)+p('M149 197Q164 199 175 196','none','#fff6e9',3))
 elif expression=='quirky': s.append(p('M143 194Q158 203 178 188','none',ink,3.4))
 else:s.append(p('M143 188Q161 201 183 189','none',ink,3.4))
 s.append(hair_front(style,hair))
 s.append(adornment(style,accent,ink))
 # small identity object on the front corner above shoulders
 s.append(token_icon(token,accent))
 s.append('</g>')
 s.append(circle(160,160,154,'none','stroke="#ffffff" stroke-width="5" stroke-opacity=".55"'))
 s.append('</svg>\n')
 svg=''.join(s)
 ElementTree.fromstring(svg)
 assert len(svg)<18000
 return svg

def main():
 DEST.mkdir(parents=True,exist_ok=True)
 assert len(SPECS)==18 and len(set(v[0] for v in SPECS))==18
 for spec in SPECS:
  path=DEST/f'{spec[0]}.svg'
  if path.exists():raise RuntimeError('EXISTING_ASSET_REFUSE_OVERWRITE '+str(path))
  path.write_text(portrait(spec),encoding='utf8')
 print('CREATED_ORIGINAL_CHARACTER_PORTRAITS',len(SPECS),'in',DEST)
if __name__=='__main__':main()

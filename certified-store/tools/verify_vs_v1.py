import json,re,sys
sys.path.insert(0,'.')
from extract_pages import all_text, all_images
pages=json.load(open('../server/seed/pages_blocks.json'))
v1=open('raw/pages_v1.txt').read().split('=====PAGE ')[1:]
n=lambda s:re.sub(r'[\s​ ]+',' ',s).strip().lower()
tot=miss=0;imgmiss=0
report={}
for chunk in v1:
    slug,body=chunk.split('\n',1)
    blob=n(' \n '.join(all_text(pages[slug])))
    imgs=set(all_images(pages[slug]))
    m=[];mi=[]
    for line in body.split('\n'):
        if line[:4] in ('#1 ','#2 ','#3 ','#4 ','#5 ','#6 ') or line.startswith(('P ','LI ','TR ')):
            txt=line.split(' ',1)[1] if not line.startswith('#') else line[3:]
            if line.startswith('TR '): txt=' '.join(x.strip() for x in txt.split('\t') if x.strip())
            tot+=1
            if n(txt) and n(txt).replace(' ','') not in blob.replace(' ','').replace('|',''):
                miss+=1;m.append(line[:140])
        if line.startswith('IMG '):
            src=line.split()[1].replace('U/','https://certifiedortho.com/wp-content/uploads/')
            if src not in imgs: imgmiss+=1; mi.append(src)
    if m or mi: report[slug]=(m,mi)
print('lines',tot,'missing',miss,'imgs missing',imgmiss)
for k,(m,mi) in report.items():
    print('==',k); [print('   T',x) for x in m[:8]]; [print('   I',x) for x in mi[:5]]

import re
def rules(p):
    s=open(p,encoding='utf-8',errors='replace').read()
    s=re.sub(r'/\*.*?\*/','',s,flags=re.S)
    out={}
    # naive top-level rule split (good enough: file has few @media nests we handle loosely)
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}',s):
        sel=' '.join(m.group(1).split())
        body=';'.join(sorted(x.strip() for x in m.group(2).split(';') if x.strip()))
        out.setdefault(sel,[]).append(body)
    return out
L=rules('/home/muskan/spakshomeopathy-backup-16-1-2026/spakshomeopathy-next/public/assets/css/style.css')
P=rules('prod-style.css')
ls,ps=set(L),set(P)
print("local rules:",len(ls)," prod rules:",len(ps))
print("ONLY IN LOCAL:",len(ls-ps))
for s in sorted(ls-ps)[:30]: print("   L-only:",s[:110])
print("ONLY IN PROD:",len(ps-ls))
for s in sorted(ps-ls)[:45]: print("   P-only:",s[:110])
diff=[s for s in ls&ps if L[s]!=P[s]]
print("SAME SELECTOR, DIFFERENT BODY:",len(diff))
for s in sorted(diff)[:30]:
    print("   ~",s[:80]); print("      L:",str(L[s])[:150]); print("      P:",str(P[s])[:150])

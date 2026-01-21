import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LockKeyhole, LoaderCircle, ZoomIn, ZoomOut, X, BookOpen } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './design-vision.css';

const chapters = ['The next chapter of play','The club, reimagined','A seat at the table','Identity before entry','One table. Any screen.','A collection that grows','A more social night','Design language'];
export default function DesignVision({onClose}:{onClose:()=>void}) {
  const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null);
  const [status,setStatus]=useState<'loading'|'locked'|'ready'|'error'>('loading');
  const [error,setError]=useState(''),[code,setCode]=useState(''),[attempt,setAttempt]=useState(0);
  const [pageNumber,setPageNumber]=useState(1),[zoom,setZoom]=useState(1),[width,setWidth]=useState(800);
  const [rendering,setRendering]=useState(false),[transcript,setTranscript]=useState('');
  const credential=useRef('');
  const frame=useRef<HTMLDivElement>(null),pageHost=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    let disposed=false;
    const abort=new AbortController();
    let task:ReturnType<typeof import('pdfjs-dist').getDocument>|undefined;
    let bytes:Uint8Array|undefined;
    setStatus('loading');setError('');setPdf(null);
    async function open() {
      try {
        const meta=await fetch('/api/design-book',{cache:'no-store',signal:abort.signal});
        if(!meta.ok)throw Error('The viewer service is unavailable. Please try again.');
        const info=await meta.json();
        if(info.locked && !credential.current){setStatus('locked');return;}
        const response=await fetch('/api/design-book',{
          method:'POST',cache:'no-store',signal:abort.signal,
          headers:credential.current?{Authorization:`Bearer ${credential.current}`}:{},
        });
        credential.current='';setCode('');
        if(response.status===401){setError('That access code was not accepted.');setStatus('locked');return;}
        if(!response.ok)throw Error('The design book could not be opened. Please check the server configuration or try again.');
        bytes=new Uint8Array(await response.arrayBuffer());
        const renderer=await import('pdfjs-dist');
        if(disposed)return;
        renderer.GlobalWorkerOptions.workerSrc=workerUrl;
        task=renderer.getDocument({data:bytes,isEvalSupported:false});
        const document=await task.promise;
        if(disposed){await document.destroy();return;}
        setPdf(document);setPageNumber(1);setStatus('ready');
      } catch(e) {
        if(!disposed){setError(e instanceof Error?e.message:'Unable to load the design book.');setStatus('error');}
      } finally {
        // PDF.js may transfer (detach) this buffer into its worker.
        if(bytes?.byteLength)bytes.fill(0);
        bytes=undefined;
      }
    }
    void open();
    return()=>{
      disposed=true;abort.abort();
      if(bytes?.byteLength)bytes.fill(0);
      void task?.destroy().catch(()=>{});
    };
  },[attempt]);

  useEffect(()=>{
    if(!frame.current)return;
    const observer=new ResizeObserver(entries=>setWidth(Math.max(240,Math.floor(entries[0].contentRect.width-24))));
    observer.observe(frame.current);return()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    if(!pdf)return;
    let disposed=false;
    let renderingTask:ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']>|undefined;
    setRendering(true);setTranscript('');
    const canvas=document.createElement('canvas');
    async function render() {
      try {
        const page=await pdf!.getPage(pageNumber);
        if(disposed)return;
        const base=page.getViewport({scale:1});
        const viewport=page.getViewport({scale:Math.min(width,1450)/base.width*zoom});
        const pixelRatio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(6000000/(viewport.width*viewport.height)));
        canvas.width=Math.floor(viewport.width*pixelRatio);canvas.height=Math.floor(viewport.height*pixelRatio);
        canvas.style.width=`${Math.floor(viewport.width)}px`;canvas.style.height=`${Math.floor(viewport.height)}px`;
        canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Page ${pageNumber}: ${chapters[pageNumber-1]||'Design concept'}`);
        renderingTask=page.render({canvas,viewport,transform:[pixelRatio,0,0,pixelRatio,0,0]});
        await renderingTask.promise;
        if(disposed)return;
        pageHost.current?.replaceChildren(canvas);
        setRendering(false);
        const content=await page.getTextContent();
        if(!disposed)setTranscript(content.items.map(item=>'str' in item?item.str:'').join(' '));
      } catch(e) {
        if(!disposed){setRendering(false);setError(e instanceof Error?e.message:'Page could not be rendered.');}
      }
    }
    void render();
    return()=>{disposed=true;renderingTask?.cancel();canvas.remove();canvas.width=0;canvas.height=0;};
  },[pdf,pageNumber,width,zoom]);

  return <section className="design-vision" aria-labelledby="vision-title">
    <div className="vision-heading"><div><span className="eyebrow">RIVER CLUB / FUTURE DESIGN</span><h1 id="vision-title">The next chapter of play.</h1><p>Explore the direction. Eight pages of environments, characters and interface concepts.</p></div><button className="vision-close" onClick={onClose}><X size={17}/> Close book</button></div>
    <div className="vision-book">
      <div className="vision-toolbar"><span><BookOpen size={17}/> Design concept book</span><span className="vision-badge">CONCEPT EXPLORATION</span></div>
      <div ref={frame} className="vision-frame" aria-busy={status==='loading'||rendering}>
        {status==='loading'&&<div className="vision-message" role="status"><LoaderCircle className="vision-spinner" size={28}/><h2>Opening the design book</h2><p>Preparing your preview…</p></div>}
        {status==='locked'&&<form className="vision-message" onSubmit={e=>{e.preventDefault();credential.current=code;setAttempt(n=>n+1);}}><LockKeyhole size={30}/><h2>A private preview</h2><p>Enter the access code shared by the project owner.</p><label htmlFor="vision-code">Access code</label><input id="vision-code" type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} required maxLength={200}/>{error&&<p role="alert">{error}</p>}<button className="gold-button" type="submit">Open design book</button></form>}
        {status==='error'&&<div className="vision-message" role="alert"><h2>Preview unavailable</h2><p>{error}</p><button className="gold-button" onClick={()=>setAttempt(n=>n+1)}>Try again</button></div>}
        <div className="vision-page-scroll" hidden={status!=='ready'}><div ref={pageHost} className="vision-page"/>{rendering&&<span className="vision-render-status" role="status">Preparing page…</span>}</div>
      </div>
      {status==='ready'&&<><div className="vision-controls"><div className="vision-navigation"><button aria-label="Previous page" disabled={pageNumber===1} onClick={()=>setPageNumber(n=>n-1)}><ChevronLeft size={18}/></button><label><span className="sr-only">Select page</span><select value={pageNumber} onChange={e=>setPageNumber(Number(e.target.value))}>{Array.from({length:pdf?.numPages||0},(_,i)=><option key={i} value={i+1}>{i+1} / {pdf?.numPages} · {chapters[i]||'Concept'}</option>)}</select></label><button aria-label="Next page" disabled={pageNumber===(pdf?.numPages||0)} onClick={()=>setPageNumber(n=>n+1)}><ChevronRight size={18}/></button></div><div className="vision-zoom"><button aria-label="Zoom out" disabled={zoom<=.75} onClick={()=>setZoom(z=>Math.max(.75,z-.25))}><ZoomOut size={17}/></button><button onClick={()=>setZoom(1)} aria-label="Fit page width">{Math.round(zoom*100)}%</button><button aria-label="Zoom in" disabled={zoom>=2} onClick={()=>setZoom(z=>Math.min(2,z+.25))}><ZoomIn size={17}/></button></div></div><div className="vision-page-dots" aria-label="Jump to a page">{chapters.map((name,i)=><button key={name} aria-label={`Page ${i+1}: ${name}`} aria-current={pageNumber===i+1?'page':undefined} onClick={()=>setPageNumber(i+1)}>{String(i+1).padStart(2,'0')}</button>)}</div>{error&&<p className="vision-note" role="alert">{error}</p>}<details className="vision-transcript"><summary>Read this page’s design notes</summary><p>{transcript||'Loading page text…'}</p></details></>}
    </div><p className="vision-note">Future design exploration. These visuals describe a proposed direction, not the current game’s implemented features.</p>
  </section>;
}

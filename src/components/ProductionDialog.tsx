import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
export default function ProductionDialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;const previous=document.activeElement as HTMLElement|null;d?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{d?.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
 return <dialog ref={ref} className="production-dialog" aria-label={title} onCancel={e=>{e.preventDefault();onClose();}}><header><h2>{title}</h2><button type="button" aria-label="Fechar janela" onClick={onClose}><X size={19}/></button></header><div className="production-dialog-body">{children}</div></dialog>;
}

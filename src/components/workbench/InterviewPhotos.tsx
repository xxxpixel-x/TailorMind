import { useEffect, useRef, useState } from "react";
import type { InterviewPhoto } from "@/lib/types";
import { photoBlob } from "@/lib/workbench-photos";
import { shortTime } from "@/lib/workbench-time";

export function PhotoImage({ photo }: { photo: InterviewPhoto }) {
  const [image, setImage] = useState<{ id: string; url: string }>();
  useEffect(() => {
    let active = true, url = "";
    void photoBlob(photo.id).then(blob => {
      if (!active) return;
      if (blob) url = URL.createObjectURL(blob);
      setImage({ id: photo.id, url });
    }).catch(() => { if (active) setImage({ id: photo.id, url: "" }); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [photo.id]);
  if (image?.id !== photo.id) return <span className="photo-placeholder">读取中</span>;
  return image.url ? <img src={image.url} alt={photo.label} /> : <span className="photo-placeholder">本机缺少照片</span>;
}

export function PhotoGallery({ photos, print = false }: { photos?: InterviewPhoto[]; print?: boolean }) {
  const [selected, setSelected] = useState<InterviewPhoto>();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (selected) dialog.current?.showModal(); }, [selected]);
  if (!photos?.length) return print ? <section className="print-only reference-photos"><h3 className="sec">客户参考图</h3><p>本单未附照片。</p></section> : null;
  return <section className={print ? "print-only reference-photos" : "photos"} aria-label={print ? "客户参考图" : "面谈照片"}>
    {print ? <h3 className="sec">客户参考图</h3> : <div className="photos-intro"><h4>面谈照片</h4><p>仅存本机</p></div>}
    <div className="photo-list">{photos.map(photo => {
      const content = <><PhotoImage photo={photo} /><span>{photo.label} · {shortTime(photo.at).split(" ")[0]}</span></>;
      return print ? <figure className="ph2" key={photo.id}>{content}</figure>
        : <button className="ph2" key={photo.id} aria-label={"放大" + photo.label} onClick={() => setSelected(photo)}>{content}</button>;
    })}</div>
    {selected && <dialog ref={dialog} className="photo-dialog" aria-label={selected.label} onClose={() => setSelected(undefined)}
      onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <PhotoImage photo={selected} /><button className="close-photo" autoFocus onClick={() => dialog.current?.close()} aria-label="关闭大图">×</button>
    </dialog>}
  </section>;
}

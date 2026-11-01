/* eslint-disable @next/next/no-img-element -- Images come from many hosts stored in the database. */
export function RemoteImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={className} />;
}

import { headerConfig } from '@/config';
import MoqianSignature from './brand/MoqianSignature';
import BrandMark from './brand/BrandMark';

export default function NoteBrandHome() {
  return (
    <a href={headerConfig.homeUrl} className="note-brand-home flex items-center gap-4 h-9" aria-label="返回网站主页">
      <MoqianSignature className="h-8 w-auto" />
      <BrandMark className="h-9" />
    </a>
  );
}

import { headerConfig } from '@/config';
import MoqianSignature from './brand/MoqianSignature';
import BrandMark from './brand/BrandMark';

export default function BlogBrandHome() {
  return (
    <a href={headerConfig.homeUrl} className="brand-home flex items-center gap-4 h-10" aria-label="返回网站主页">
      <MoqianSignature className="h-9 w-auto" />
      <BrandMark className="h-10" />
    </a>
  );
}

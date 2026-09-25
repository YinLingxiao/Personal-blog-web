# Moqian 签名字标

`moqian-wordmark.svg` 是用户认可的星月 Logo 方案中的手写 Moqian 字标，经轮廓矢量化用于网站；它是固定字形，不是可输入任意文本的字体。原稿为本任务 ImageGen 产物 `exec-8f0a111d-96d9-45de-91bb-0ee0de4e5191.png`，字标取自 (496, 450, 544, 194) 区域，使用 Potrace 阈值 152、optTolerance 0.2 转换。网站运行不依赖该 PNG、Potrace 或远程字体。

`MoqianSignature.tsx` 和 `signature.css` 为三个站点的统一实现。首次进入视口时以轮廓描绘及从左到右的墨迹显现组合播放，字标自身悬停和所属链接键盘聚焦可重播。动画进行时不会反复重置；减少动态效果时立即显示完整字标；卸载时清理观察器、事件和动画。

`BrandMark.tsx` 与 `BrandMark.css` 为星月图形标的 SVG 实现，依据最终确认的尖顶光芒、长尾四芒星和右下承托新月重绘。独立路径保留小尺寸留白，以暖白呈现；页眉使用 36–40px 高度，与字标直接相邻。动效“月托星升”共 1650ms：月牙先托起（650ms），星芒延迟 260ms 升起（800ms），顶部光芒延迟 620ms 提锋落定（1030ms）。首次进入视口、图形自身悬停及所属链接键盘聚焦播放；字标与图形的鼠标触发区域独立，进行中不重置，离开后正常播完；触屏不拦截点击，reduced-motion 切换时立即取消动画恢复静态，卸载时清理监听与观察器。旧 brand-mark.png 仅保留为历史素材，组件和同步流程不再依赖它。

修改本目录后执行 `node scripts/sync-brand.mjs`，同步至各站点 `src/components/brand/`（组件与样式）；dev/build 也会自动同步。执行 `node scripts/sync-brand.mjs --check` 检查副本。各站点独立构建和部署，不跨站请求资源。业务组件负责链接和尺寸，本目录负责字形、图形与动效。

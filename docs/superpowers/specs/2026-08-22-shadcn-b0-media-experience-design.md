# YlTt2025 shadcn b0 媒体体验设计

## 目标

将全站 UI 统一到 shadcn 的 `b0` 预设（用户选择重装策略），并以移动端优先的方式补齐个人中心、后台内容创建、媒体上传预览、摄影详情大图和短片播放体验。

## 已确认的产品决策

- 全站（包括后台）使用同一套 shadcn `b0` 预设；不再维护 `base-nova` 的组件源码。
- 预设重装会覆盖 shadcn 组件源码与全局主题 token，但保留业务页面、Server Action、Supabase 服务和领域模型。
- 前台与后台仅通过页面级密度、布局和语义 token 使用差异表达，不创建第二套组件主题。
- 头像使用移动端友好的裁剪流程；故事编辑使用 Markdown 编辑器；短片和摄影均需要真实文件预览。
- 摄影元数据只做格式化展示，不对光圈、快门速度、ISO、焦距设定业务范围校验。
- GPS 坐标优先由 EXIF 读取并反向解析地点；失败后允许一键读取浏览器当前位置，也允许用户手动填写。
- `react-photo-view` 同时用于后台摄影文件预览和摄影详情页查看大图。
- 视频详情使用现有 `react-player` v3，并保留原生 `<video>` 兼容兜底。

## 预设切换

实施阶段使用 shadcn CLI 的 `b0` 预设重装流程。重装前记录 `components.json`、`app/globals.css` 和现有 `components/ui` 的差异；重装后逐页修复导入和新版 API 组合。不得回退用户已有的业务文件变更。

## 技术选型

- 头像裁剪：`react-easy-crop`，支持触控缩放、旋转和固定头像比例。
- 文件选择：`react-dropzone`，统一处理拖拽、移动端文件选择、类型提示和本地 object URL 生命周期。
- Markdown：`@uiw/react-md-editor`，在故事编辑页面通过 `next/dynamic` 客户端懒加载；预览输出继续使用 `react-markdown`、`remark-gfm` 和 `rehype-sanitize`。
- 摄影查看：`react-photo-view`，用于上传后预览、摄影详情主图和全屏灯箱。
- 视频播放：`react-player` v3，封装为客户端播放器组件，使用稳定的 aspect-ratio 容器、播放/暂停、进度和错误状态；无法由播放器处理的直接文件由原生 `<video>` 兜底。
- EXIF：继续使用 `exifr`，只填充存在的值。
- UI：重装后的 shadcn `b0` 组件优先，使用 `Field`、`Input`、`Textarea`、`Select`、`Switch`、`Tabs`、`Dialog`、`Sheet`、`Sidebar`、`Table`、`Badge`、`Alert`、`Progress`、`Skeleton`、`Avatar`、`Toast/Sonner` 等组合。

## 页面与组件

### 个人中心

头像按钮打开 shadcn `Dialog`：`Dropzone -> Cropper -> 预览 -> 上传`。上传使用现有 OSS 签名接口，成功后才更新头像 URL；取消、格式错误或上传失败均保留旧头像。表单使用 shadcn `FieldGroup`/`Field` 和移动端单列布局，桌面端再扩展为信息与隐私设置双栏。

### 后台内容管理

后台仍为 shadcn `b0` 的 Sidebar/Sheet shell。新建故事使用 `Tabs` 切换编辑和预览，编辑器只在需要时加载。短片选择后显示本地视频首帧、时长、大小和可替换操作；摄影选择后显示可点击的图片预览和 `react-photo-view` 大图查看。上传表单使用 `Field`、`Select`、`Switch` 和 `Alert`，避免原生 select/checkbox 混用。

摄影地点区域显示解析状态、地点公开范围、可编辑城市/地区/名称和“一键获取地理位置”按钮。解析成功只填充建议值，不锁定输入。

### 详情页

摄影详情页主图使用 `PhotoProvider/PhotoView`，缩放或全屏关闭后保持原布局和滚动位置。短片详情页使用播放器组件，支持 `playsInline`、预加载元数据、错误提示和响应式容器。

## 数据流与失败处理

1. 头像：选择 -> 裁剪 -> Blob -> 当前用户签名 -> OSS -> 更新 profile。
2. 媒体预览：文件 -> object URL -> 预览组件；组件卸载、替换和提交完成时 revoke URL。
3. EXIF：读取字段 -> 坐标存在时调用服务端反向地理编码 Route -> 结果写入可编辑表单。无 EXIF、解析失败或网络失败都不阻塞提交。
4. 浏览器定位：请求权限 -> 获取经纬度 -> 服务端反向地理编码；拒绝/超时/不可用时显示中文可操作错误。
5. Markdown：编辑原文 -> 客户端预览 -> 服务端保存原文；预览必须 sanitize，禁止脚本和危险 HTML。
6. 媒体加载错误：播放器、图片查看器和上传预览均显示 shadcn `Alert`，提供重试或替换入口。

反向地理编码 Route 使用服务端请求 Nominatim（或项目配置的同等服务），设置明确 User-Agent 和超时；不把 API 凭据或内部异常返回到浏览器。

## 响应式与可访问性

- 默认手机单列、`md`/`lg` 再增加双栏和侧边栏。
- 媒体容器用 `aspect-ratio`/`minmax` 固定布局，避免预览加载时跳动。
- 后台移动端 Sidebar 变为 Sheet，表格只在自身区域横向滚动。
- 所有 Dialog/Sheet/Drawer 有标题；头像、大图、播放器和上传控件提供可访问名称；键盘可关闭灯箱和操作播放器。
- 使用语义 token、`gap-*` 和 `size-*`，不使用 `space-*`、硬编码颜色或负字距。

## 测试与验收

- `npm run typecheck`、`npm test`、`npm run build` 全部通过。
- 验证 `components.json` 使用 `b0`，重装后 UI 组件导入和 API 组合无错误。
- 个人中心完成头像裁剪、取消、失败恢复、上传和资料保存。
- 后台故事编辑/预览、短片帧预览、摄影大图预览、EXIF 无范围校验、地点解析/定位/手填全部可用。
- 摄影详情页可打开、缩放、关闭大图；短片详情页可播放、暂停、拖动进度并显示错误状态。
- 浏览器检查桌面和 390px 移动宽度：页面非空、无 Next 错误覆盖层、无相关控制台错误、无横向溢出，并完成至少一条核心交互链路。

## 实施边界

本次不新增社交关系、国际化系统、视频转码服务或永久保存的地理位置历史；反向地理编码仅用于内容创建时给出可编辑建议。

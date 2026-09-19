# Design system

## Direction

以 Apple 官网的中性配色为参考，工作界面优先。纯白与浅灰分层，近黑标题，蓝色只用于操作与焦点。移除标语侧栏、装饰插画和英文眉题。

## Colors

Background #ffffff; secondary surface #f5f5f7; primary text #1d1d1f; secondary text #616166; border #dedee2; interactive blue #0066cc; primary button #0071e3.

## Typography

本机 system font stack，桌面标题 40px、移动端 28px，正文 14–16px。无字体网络请求。

## Components

导航为文本标签，主操作为胶囊按钮。伙伴使用分隔线列表而非彩色卡片；所有头像为中性灰。表单保留原生控件及 dialog，圆角不超过 16px。

## Layout and motion

1120px 内容宽度，留白集中在标题与工作区之间。桌面伙伴行分为身份、技能与简介、操作三列，移动端堆叠。交互过渡 180ms，减少动态效果时禁用。

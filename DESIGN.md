# Design system

## Direction

以 Apple 官网的中性配色为参考，工作界面优先。纯白与浅灰分层，近黑标题，蓝色只用于操作与焦点。移除标语侧栏、装饰插画和英文眉题。

## Colors

Background #ffffff; secondary surface #f5f5f7; primary text #1d1d1f; secondary text #616166; border #dedee2; interactive blue #0066cc; primary button #0071e3.

## Typography

本机 system font stack，桌面标题 40px、移动端 28px，正文 14–16px。无字体网络请求。

## Components

导航为文本标签，主操作为胶囊按钮。推荐使用浅灰技能卡列表，技能名称双列展示；所有头像为中性灰。表单保留原生控件及 dialog，圆角不超过 16px。

## Layout and motion

1120px 内容宽度，留白集中在标题与工作区之间。桌面左侧选择想学技能和管理供给、右侧比较候选；移动端上下堆叠，技能标签换行。互换详情采用进度条、方案与动态双栏；手机单栏。能力材料默认折叠，按需展开。交互过渡 180ms，减少动态效果时禁用。

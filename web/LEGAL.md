# 法律风险说明 / Legal Risk Note

> 这不是法律意见。商业化发布前请咨询目标市场的执业律师。
> This is not legal advice. Consult counsel in your target markets before release.

## 我们做了什么 / What this tool does

参数化生成浴室柜几何（柜体、抽屉、门板、台面开孔、镜柜），组件名用**通用风格描述词**，
品牌名仅作为“风格参考”标签。**不**捆绑任何 Logo、产品照片、官方 CAD、产品型号数据。

Geometry is generated parametrically. Preset names are **generic style descriptors**.
Brand names are used only as style-reference labels. **No** logos, product photos,
official CAD, or manufacturer model data are bundled.

## 风险分级 / Risk assessment

| 类型 Type | 风险 Risk | 现状 Mitigation |
|---|---|---|
| 商标 Trademark | 中 Medium |  descriptively naming a brand as style reference is generally permissible (US nominative fair use; EU "reference to goods" under Art. 6 TMD). We do **not** use logos, trade dress, or "official / compatible with" claims. Keep it that way. |
| 产品名称 Product-line names | 高 High → 已消除 | 原来的 `Neorest` / `Xilesa` / `Composed` 等是注册产品系列名，已改为 `Minimal 900` / `Cube 1000` / `Modern 900` 等通用词。**不要改回型号名。** |
| 外观设计 Design patents / registered designs | 低 Low | 几何是通用箱体 + 抽屉 + 圆角，非任何品牌的专利造型复制。若将来加入异形盆/龙头造型，需重新评估。 |
| 版权 Copyright | 低 Low | 所有纹理由 `tools/gen-textures.js` 程序化生成，无第三方图片。 |
| 虚假关联 False association | 中 Medium | UI 内有免责声明（品牌库折叠区）。发布页、关于页、导出文件应同样声明。 |

## 发布前清单 / Pre-release checklist

1. 保留 UI 免责声明（中英双语，位于品牌库区块）。
2. 官网/应用商店描述写 "independent design tool, not affiliated with any manufacturer"。
3. 不使用任何品牌 Logo 或产品图。用户上传的图片由其自行负责。
4. 若要做“官方合作模型库”，需取得书面授权 —— 那是另一条产品线。
5. 目标市场为欧盟时，注意指令 2009/125/EC 与 REACH 对建材/家具的环保要求（与品牌无关，但商业销售适用）。
6. 软件本身 GPL/MIT 等开源许可与品牌授权是两件事，别混为一谈。

## 代码约束 / Code constraints

`index.html` 中 `BRANDS` 数组顶部有注释标记：

```
// ponytail/legal: preset names are generic style descriptors, NOT product-line names.
```

新增品牌时遵守：只用品牌**公司名**作标签，预设名用「风格 + 尺寸」通用描述。

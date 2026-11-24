export type KGNodeType =
  | "body_context" // 体征/内搭/场合约束
  | "pattern"      // 版型结构
  | "collar"       // 领型
  | "fabric"       // 面料
  | "craft"        // 盘扣与装饰工艺
  | "shaping";     // 归拔与整烫工艺

export type KGRelationType =
  | "COMPATIBLE_WITH" // 适配推荐
  | "REQUIRES_SHAPING" // 必须配合归拔/整烫工艺
  | "CONFLICTS_WITH";  // 工艺禁忌/不可制造冲突

export interface KGNode {
  id: string;
  label: string;
  type: KGNodeType;
  summary: string;
  assetId?: string; // 关联到现有 PAT-/FAB-/CRF-/RULE- 资产编号
  params?: string[];
}

export interface KGEdge {
  id: string;
  from: string;
  to: string;
  relation: KGRelationType;
  severity?: "blocked" | "caution";
  reason: string;
  alternativeNodeId?: string;
  alternativeHint?: string;
}

export const KG_NODE_TYPE_META: Record<
  KGNodeType,
  { label: string; short: string; layer: number }
> = {
  body_context: { label: "体征 / 场合约束", short: "约束", layer: 0 },
  pattern: { label: "版型母版", short: "版型", layer: 1 },
  collar: { label: "领型制式", short: "领型", layer: 2 },
  fabric: { label: "海派面料", short: "面料", layer: 3 },
  craft: { label: "盘扣与工艺", short: "工艺", layer: 4 },
  shaping: { label: "归拔与整烫", short: "归拔", layer: 5 },
};

export const CRAFT_KG_NODES: KGNode[] = [
  // 0. 体征 / 内搭 / 场合约束节点
  {
    id: "CTX-QIPAO-STAND",
    label: "内搭立领旗袍",
    type: "body_context",
    assetId: "RULE-GEN-08",
    summary: "外套叠穿在立领旗袍外，领口高度与形态必须避让内搭立领。",
    params: ["衣长盖过旗袍腰线", "露出下摆", "禁止双层高立领叠加"],
  },
  {
    id: "CTX-SHORT-NECK",
    label: "短颈 / 怕卡脖",
    type: "body_context",
    assetId: "RULE-SF-01",
    summary: "颈部偏短或对高领敏感，领高须严格控制在 3.0cm 以内或无立领。",
    params: ["前领窝降 0.6–0.8cm", "领高 ≤ 3.0cm"],
  },
  {
    id: "CTX-HUNCHBACK",
    label: "圆背 / 轻微驼背",
    type: "body_context",
    assetId: "RULE-GEN-01",
    summary: "后背弧度偏大，需后衣片加长与后背宽加放，并结合肩胛归拔定型。",
    params: ["后衣片加长", "后背宽加放", "忌薄软贴背针织"],
  },
  {
    id: "CTX-BELLY",
    label: "腹部微隆 / 小肚腩",
    type: "body_context",
    assetId: "RULE-SF-03",
    summary: "采用无收腰 H 型直身，前腹留动态松量并做立体归拔防止前摆上翘。",
    params: ["H型无收腰", "前腹加放 4–6cm", "前衣长微补偿"],
  },
  {
    id: "CTX-WASHABLE",
    label: "高频可机洗 / 团装免打理",
    type: "body_context",
    assetId: "RULE-GEN-07",
    summary: "团体职业服或客户明说可水洗免烫，严禁使用遇水缩皱或掉浆的天然丝锦。",
    params: ["水洗缩率 ≤ 1.5%", "抗皱 4 级以上"],
  },
  {
    id: "CTX-STAGE-ARM",
    label: "抬臂敬酒 / 舞台演奏",
    type: "body_context",
    assetId: "RULE-SF-06",
    summary: "需要大幅度抬手举杯或器乐演奏，袖笼放量充足且避免长流苏缠绕。",
    params: ["袖山降 1.2cm", "袖肥加放 2.5cm"],
  },

  // 1. 版型母版节点
  {
    id: "PAT-SF-01",
    label: "低立领 H 型外套",
    type: "pattern",
    assetId: "PAT-SF-01",
    summary: "海派微落平肩低立领 H 型直身外套，短颈与小肚腩实证母版。",
    params: ["常规缝份 1.0cm", "底摆折边 2.0cm"],
  },
  {
    id: "PAT-SF-02",
    label: "窄青果领优雅女装",
    type: "pattern",
    assetId: "PAT-SF-02",
    summary: "海派窄青果西装领微收腰母版，旗袍外搭与拉长颈线优选。",
    params: ["领宽 5.5cm", "胸围叠穿余量 3cm"],
  },
  {
    id: "PAT-SF-03",
    label: "斜襟短外套+大摆裙",
    type: "pattern",
    assetId: "PAT-SF-03",
    summary: "舞台演出/礼仪两件套，抬臂与坐奏动态放量母版。",
    params: ["来去缝 1.2cm", "翻折袖口 6.5cm"],
  },
  {
    id: "PAT-SF-04",
    label: "自然落肩松弛外套",
    type: "pattern",
    assetId: "PAT-SF-04",
    summary: "落肩量 2.5–3.0cm，专为溜肩与小肚腩设计，含前腹立体归拔量。",
    params: ["包缝滚条处理", "前腹归拔预留"],
  },
  {
    id: "PAT-SF-05",
    label: "马头墙阶梯夹克",
    type: "pattern",
    assetId: "PAT-SF-05",
    summary: "肩胸 90° 阶梯撞色分割母版，对拼接料缩水率差有严格限制。",
    params: ["转角缝份 0.8cm", "缩率差 ≤ 10%"],
  },
  {
    id: "PAT-SF-06",
    label: "无扣交领宽肩母版",
    type: "pattern",
    assetId: "PAT-SF-06",
    summary: "无立领一体式门襟贴边宽肩廓形，零颈部压迫，适配旗袍立领避让。",
    params: ["4.5cm 一体贴边", "后背加放 1.5cm"],
  },
  {
    id: "PAT-UNI-01",
    label: "团装高管微立领母版",
    type: "pattern",
    assetId: "PAT-UNI-01",
    summary: "男女同源分级团装高管版型，侧胁缝预留 2.0cm 特体改衣余量。",
    params: ["2.6cm 缺角微立领", "胁缝预留 2.0cm"],
  },

  // 2. 领型制式节点
  {
    id: "COL-HIGH-STAND",
    label: "传统高立领 (≥3.5cm)",
    type: "collar",
    summary: "传统硬衬高立领，挺拔复古，但易与内搭立领冲突且卡短颈。",
    params: ["领高 3.8–4.5cm", "硬衬定型"],
  },
  {
    id: "COL-LOW-STAND",
    label: "海派圆角低立领 (≤3cm)",
    type: "collar",
    summary: "2.5–3.0cm 圆角低立领配软衬，兼顾中式韵味与舒适度。",
    params: ["领高 2.5–3.0cm", "前领降 0.6cm"],
  },
  {
    id: "COL-SHAWL",
    label: "窄青果西装领",
    type: "collar",
    summary: "纵向 V 区拉长颈部线条，天然避让内搭旗袍立领。",
    params: ["驳领宽 5.5cm", "避让立领"],
  },
  {
    id: "COL-WRAP",
    label: "无扣中式交领",
    type: "collar",
    summary: "无立领一体式交领开襟，彻底解放肩颈并避免双领打架。",
    params: ["无领座", "4.5cm 一体贴边"],
  },

  // 3. 海派面料节点
  {
    id: "FAB-SF-01",
    label: "高密重磅提花宋锦",
    type: "fabric",
    assetId: "FAB-SF-01",
    summary: "桑蚕丝 42% / 粘纤 58%，240–265g/m²，挺而不硬，严禁水洗。",
    params: ["仅限低温干洗", "挺括不贴背"],
  },
  {
    id: "FAB-SF-02",
    label: "非遗薯莨香云纱",
    type: "fabric",
    assetId: "FAB-SF-02",
    summary: "100% 桑蚕丝天然晒莨，哑光乌金肌理，严禁机洗与高温直烫。",
    params: ["不可机洗", "须低温垫布轻烫"],
  },
  {
    id: "FAB-SF-03",
    label: "重磅桑蚕丝织花绸",
    type: "fabric",
    assetId: "FAB-SF-03",
    summary: "100% 6A 桑蚕丝小团花暗纹，骨感适中，宽肩与正式场合优选。",
    params: ["专业干洗", "悬垂有骨感"],
  },
  {
    id: "FAB-SF-04",
    label: "三醋酸薄款提花锦",
    type: "fabric",
    assetId: "FAB-SF-04",
    summary: "三醋酯 72% / 聚酯 28%，抗皱垂顺不贴腹，可轻柔水洗。",
    params: ["抗皱高", "防静电不贴身"],
  },
  {
    id: "FAB-SF-05",
    label: "高垂感亮面重磅缎",
    type: "fabric",
    assetId: "FAB-SF-05",
    summary: "桑蚕丝 35% / 醋酸 65%，镜面光泽易滑丝，忌直角锐角剪口拼接。",
    params: ["防极光印", "需来去缝防脱丝"],
  },
  {
    id: "FAB-SF-06",
    label: "双面肌理提花针织",
    type: "fabric",
    assetId: "FAB-SF-06",
    summary: "棉 48% / 羊毛 32% / 弹力丝 20%，四面微弹，不承重硬质铜丝盘扣。",
    params: ["四面微弹", "免烫抗皱"],
  },
  {
    id: "FAB-UNI-01",
    label: "Super 110s 抗皱羊毛呢",
    type: "fabric",
    assetId: "FAB-UNI-01",
    summary: "羊毛 60% / 聚酯 38% / 氨纶 2%，3年补单色差 ΔE<0.8，归拔塑形极佳。",
    params: ["极高抗皱", "极佳归拔塑形"],
  },
  {
    id: "FAB-UNI-02",
    label: "抗静电可水洗三醋酸缎",
    type: "fabric",
    assetId: "FAB-UNI-02",
    summary: "改性三醋酸 + 导电丝，支持轻柔机洗、永久抗静电。",
    params: ["支持机洗", "永久抗静电"],
  },

  // 4. 盘扣与海派装饰工艺节点
  {
    id: "CRF-02",
    label: "手工刮浆铜丝一字盘扣",
    type: "craft",
    assetId: "CRF-02",
    summary: "45° 斜裁真丝滚条内衬铜丝与玉米浆定型，需梭织骨感面料承重。",
    params: ["内衬铜丝定型", "脚根加固暗按扣"],
  },
  {
    id: "CRF-03",
    label: "1.5mm 海派极细嵌条滚边",
    type: "craft",
    assetId: "CRF-03",
    summary: "三镶三滚现代简化版，45° 正斜丝包芯绳，仅占全身 1% 面积。",
    params: ["宽 1.5–2.0mm", "缝份 0.6cm 匀速送布"],
  },
  {
    id: "CRF-04",
    label: "马头墙 90° 阶梯拼接",
    type: "craft",
    assetId: "CRF-04",
    summary: "直角阶梯撞色分割，转角打剪口至距缝线 1mm，须用稳密防脱丝面料。",
    params: ["高密定型衬", "缩水率差 ≤ 10%"],
  },
  {
    id: "CRF-05",
    label: "傲梅暗花+微闪星光纬纱",
    type: "craft",
    assetId: "CRF-05",
    summary: "同色底布隐现梅枝暗纹与细碎微光，需提前对花避开腹部中心。",
    params: ["左前胸黄金区排花", "微光纬纱"],
  },
  {
    id: "CRF-01",
    label: "无扣一体贴边+侧衩挡布",
    type: "craft",
    assetId: "CRF-01",
    summary: "前门襟 4.5cm 双层一体贴边配防走光侧衩挡布，极简利落。",
    params: ["无外露纽扣", "侧衩 12cm+4cm 挡布"],
  },

  // 5. 海派归拔与整烫工艺节点（专项补齐）
  {
    id: "SHP-01",
    label: "前腹立体归拔定型",
    type: "shaping",
    summary: "针对腹部微隆体态，前片腰腹侧缝推归、前中微拔，预留立体弧度防门襟炸开与前摆上翘。",
    params: ["温度 140–160°C（毛呢）", "前中归缩 0.6–0.8cm", "垫水布立体扣烫"],
  },
  {
    id: "SHP-02",
    label: "肩胛圆背归拔塑形",
    type: "shaping",
    summary: "针对轻微驼背/圆背，后背肩胛骨区拔长推归、后领口收归贴合，彻底消除后摆吊起与后领空鼓。",
    params: ["后领口归缩 0.5–0.8cm", "肩胛区弧度拔开", "配馒头铁凳定型"],
  },
  {
    id: "SHP-03",
    label: "海派低立领圆弧拔烫",
    type: "shaping",
    summary: "将直裁/微弯低立领条沿下口拔长、上口轻归，形成贴合脖颈的立体马鞍弧度，久穿不翻卷不卡喉。",
    params: ["领下口拔长 0.6cm", "领上口微归 0.3cm", "软衬粘合"],
  },
  {
    id: "SHP-04",
    label: "真丝/香云纱低温垫布轻归拔",
    type: "shaping",
    summary: "针对香云纱、宋锦、重磅桑蚕丝等娇贵蛋白纤维，严禁干热强力归拔；采用反面垫白棉布 110–125°C 轻蒸汽微调，防止极光印与薯莨涂层龟裂。",
    params: ["温度 ≤ 125°C", "反面垫布", "禁喷直水防渍印"],
  },
];

export const CRAFT_KG_EDGES: KGEdge[] = [
  // === 冲突 / 不可制造硬约束边 ===
  {
    id: "EDGE-C01",
    from: "CTX-QIPAO-STAND",
    to: "COL-HIGH-STAND",
    relation: "CONFLICTS_WITH",
    severity: "blocked",
    reason: "立领旗袍外搭传统高立领会产生双层硬领叠压，颈部闷重局促且顶压下颌，属于不可接受的叠穿结构冲突。",
    alternativeNodeId: "COL-SHAWL",
    alternativeHint: "改为窄青果西装领（PAT-SF-02）或无扣交领（PAT-SF-06）彻底避让旗袍立领。",
  },
  {
    id: "EDGE-C02",
    from: "CTX-SHORT-NECK",
    to: "COL-HIGH-STAND",
    relation: "CONFLICTS_WITH",
    severity: "blocked",
    reason: "短颈或怕卡脖体态严禁 3.5cm 以上传统高立领，低头转头必然顶喉卡脖。",
    alternativeNodeId: "COL-LOW-STAND",
    alternativeHint: "替换为 ≤3.0cm 海派圆角低立领（配前领窝降 0.6cm）或无立领交领。",
  },
  {
    id: "EDGE-C03",
    from: "FAB-SF-06",
    to: "CRF-02",
    relation: "CONFLICTS_WITH",
    severity: "blocked",
    reason: "肌理提花针织具有四面弹力，手工刮浆铜丝一字盘扣（带流苏）自重与拉力会导致针织门襟下坠变形、针眼撕裂，版房无法保证长期平整度。",
    alternativeNodeId: "CRF-03",
    alternativeHint: "针织面料建议改为 1.5mm 极细嵌条滚边（CRF-03）或阶梯撞色拼接（CRF-04）暗扣门襟。",
  },
  {
    id: "EDGE-C04",
    from: "FAB-SF-05",
    to: "CRF-04",
    relation: "CONFLICTS_WITH",
    severity: "blocked",
    reason: "高垂感亮面重磅缎经纬滑爽易脱丝，马头墙 90° 直角阶梯拼接需在转角打剪口至距缝线 1mm，亮缎极易在剪口处抽纱崩裂。",
    alternativeNodeId: "FAB-SF-06",
    alternativeHint: "做 90° 阶梯撞色拼接须改用双面肌理提花针织（FAB-SF-06）或高支抗皱羊毛呢（FAB-UNI-01）。",
  },
  {
    id: "EDGE-C05",
    from: "CTX-WASHABLE",
    to: "FAB-SF-02",
    relation: "CONFLICTS_WITH",
    severity: "blocked",
    reason: "非遗薯莨香云纱为纯手工河泥晒制真丝，严禁机洗与碱性洗涤剂，机洗会导致薯莨胶质剥落发白、严重缩皱。",
    alternativeNodeId: "FAB-UNI-02",
    alternativeHint: "要求可机洗免打理时，替换为抗静电可水洗三醋酸职业缎（FAB-UNI-02）或三醋酸提花锦（FAB-SF-04）。",
  },
  {
    id: "EDGE-C06",
    from: "CTX-WASHABLE",
    to: "FAB-SF-01",
    relation: "CONFLICTS_WITH",
    severity: "blocked",
    reason: "高密重磅提花宋锦含桑蚕丝与粘纤长丝经锦交织，水洗缩水率不均且纬花起毛变形，仅支持低温石油干洗。",
    alternativeNodeId: "FAB-SF-04",
    alternativeHint: "改用进口级三醋酸薄款提花锦（FAB-SF-04），保留提花暗纹观感同时支持轻柔水洗。",
  },
  {
    id: "EDGE-C07",
    from: "CTX-HUNCHBACK",
    to: "FAB-SF-06",
    relation: "CONFLICTS_WITH",
    severity: "caution",
    reason: "轻微驼背若使用偏柔软贴背的针织料，易勾勒后背拱弧，需搭配高密挺括组织或改用有骨感梭织。",
    alternativeNodeId: "FAB-SF-01",
    alternativeHint: "优先选用挺而不硬的提花宋锦（FAB-SF-01）或重磅织花绸（FAB-SF-03），并结合后背肩胛归拔（SHP-02）。",
  },
  {
    id: "EDGE-C08",
    from: "CTX-STAGE-ARM",
    to: "CRF-02",
    relation: "CONFLICTS_WITH",
    severity: "caution",
    reason: "器乐演奏或频繁举杯敬酒场景中，盘扣配长流苏存在钩挂琴弦或蘸碰酒水的风险。",
    alternativeNodeId: "CRF-01",
    alternativeHint: "保留一字盘扣但去掉长流苏，或采用无扣一体贴边（CRF-01）+ 脚根暗按扣加固。",
  },

  // === 必须配合归拔 / 整烫工艺边 ===
  {
    id: "EDGE-S01",
    from: "CTX-BELLY",
    to: "SHP-01",
    relation: "REQUIRES_SHAPING",
    reason: "腹部微隆采用 H 型直身时，须对前片腰腹做立体归拔，消除前摆上翘。",
  },
  {
    id: "EDGE-S02",
    from: "CTX-HUNCHBACK",
    to: "SHP-02",
    relation: "REQUIRES_SHAPING",
    reason: "圆背/驼背除纸样加长后衣片外，须在版房对肩胛区与后领做归拔塑形。",
  },
  {
    id: "EDGE-S03",
    from: "COL-LOW-STAND",
    to: "SHP-03",
    relation: "REQUIRES_SHAPING",
    reason: "海派圆角低立领须经领下口拔长、上口轻归拔烫，才能贴颈不翘角。",
  },
  {
    id: "EDGE-S04",
    from: "FAB-SF-02",
    to: "SHP-04",
    relation: "REQUIRES_SHAPING",
    reason: "香云纱遇高温直烫易损伤薯莨涂层，全衣须执行低温垫布轻归拔规范。",
  },
  {
    id: "EDGE-S05",
    from: "FAB-SF-01",
    to: "SHP-04",
    relation: "REQUIRES_SHAPING",
    reason: "提花宋锦含桑蚕丝，熨烫归拔须垫白棉布且控温 ≤125°C 防压平提花浮雕。",
  },
  {
    id: "EDGE-S06",
    from: "FAB-SF-03",
    to: "SHP-04",
    relation: "REQUIRES_SHAPING",
    reason: "重磅桑蚕丝织花绸需低温蒸汽垫布归拔，避免水渍印与极光。",
  },

  // === 适配推荐边 ===
  {
    id: "EDGE-A01",
    from: "CTX-QIPAO-STAND",
    to: "PAT-SF-02",
    relation: "COMPATIBLE_WITH",
    reason: "窄青果领短外套盖过旗袍腰线、自然避让立领，经典稳妥。",
  },
  {
    id: "EDGE-A02",
    from: "CTX-QIPAO-STAND",
    to: "PAT-SF-06",
    relation: "COMPATIBLE_WITH",
    reason: "无扣交领完全无领座，与旗袍立领零冲突且最具现代利落感。",
  },
  {
    id: "EDGE-A03",
    from: "PAT-SF-01",
    to: "COL-LOW-STAND",
    relation: "COMPATIBLE_WITH",
    reason: "标准海派低立领 H 型母版，领高 2.6–3.0cm。",
  },
  {
    id: "EDGE-A04",
    from: "PAT-SF-02",
    to: "COL-SHAWL",
    relation: "COMPATIBLE_WITH",
    reason: "连身窄青果领面，纵向 V 区优化颈肩比例。",
  },
  {
    id: "EDGE-A05",
    from: "PAT-SF-06",
    to: "COL-WRAP",
    relation: "COMPATIBLE_WITH",
    reason: "中式无扣交领配 4.5cm 一体式门襟贴边。",
  },
  {
    id: "EDGE-A06",
    from: "FAB-SF-01",
    to: "CRF-02",
    relation: "COMPATIBLE_WITH",
    reason: "重磅提花宋锦骨感足，极佳承托海派手工刮浆一字盘扣。",
  },
  {
    id: "EDGE-A07",
    from: "FAB-SF-02",
    to: "CRF-03",
    relation: "COMPATIBLE_WITH",
    reason: "哑光乌金香云纱配 1.5mm 古金/暗红极细嵌条，克制提神。",
  },
  {
    id: "EDGE-A08",
    from: "FAB-SF-06",
    to: "CRF-04",
    relation: "COMPATIBLE_WITH",
    reason: "双面提花针织密实防脱丝，完美实现马头墙 90° 阶梯拼接。",
  },
  {
    id: "EDGE-A09",
    from: "FAB-UNI-01",
    to: "SHP-01",
    relation: "COMPATIBLE_WITH",
    reason: "高支美丽奴羊毛混纺呢归拔定型记忆力极佳。",
  },
  {
    id: "EDGE-A10",
    from: "FAB-SF-03",
    to: "CRF-01",
    relation: "COMPATIBLE_WITH",
    reason: "重磅桑蚕丝织花绸悬垂挺括，适合无扣一体式门襟贴边极简做法。",
  },
  {
    id: "EDGE-A11",
    from: "PAT-SF-04",
    to: "SHP-01",
    relation: "REQUIRES_SHAPING",
    reason: "PAT-SF-04 裁片内置前腹微凸归拔量，成衣须配套前腹立体归拔。",
  },
];

export const KG_NODE_BY_ID = new Map(CRAFT_KG_NODES.map((n) => [n.id, n]));

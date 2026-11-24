import type { HistoricalCaseAsset } from "@/lib/types";

export const CASE_KB: HistoricalCaseAsset[] = [
  {
    id: "CASE-SF-01",
    title: "案例一：中式端庄偏门襟外套（短颈与肚腩体型修饰）",
    sourceType: "上服集团官方真实案例 (2026.11)",
    mode: "bespoke",
    customerRawQuote:
      "想要一件定制一件外套，整体风格偏中式一点，整体端庄一些，适合正式场合穿着。脖子比较短领子不能太高。我还有肚腩，然后喜欢稍微宽松一点的衣服，不能太紧绷，舒服一点。要显得人气质好。",
    translation: {
      category: "外套",
      structure: "H 型直身结构，无收腰；肩型采用微落平肩，线条简约利落",
      collar: "低立领（领高控制在3cm以内），领线条圆润",
      fabric: "优选垂感适中、手感柔和的醋酸或者薄款提花锦，挺而不硬，穿着舒适不易贴身",
      color: "无特殊需求",
      patternCraft: "无特殊需求",
      lengthRatio: "衣长至臀中位置",
      easeAllowance: "前片腹部区域预留充足松量，整体围度宽松"
    },
    matchedPatternId: "PAT-SF-01",
    matchedFabricId: "FAB-SF-04",
    matchedCraftIds: ["CRF-07"],
    images: [
      { url: "/cases/shangfu/image1.jpeg", caption: "案例一成衣实物挂拍图（偏门襟低立领博古暗纹外套）", stage: "实拍成衣" },
      { url: "/cases/shangfu/image2.png", caption: "案例一上身穿搭氛围效果图", stage: "上身效果" }
    ],
    expertTakeaway:
      "短颈客户严控立领高度 ≤3cm 并做圆角处理；肚腩客户忌收腰紧绷，改用微落平肩 H 型直身 + 挺而不硬不贴身的醋酸/提花锦，实现藏肉显端庄。",
    tags: ["短颈修饰", "肚腩藏肉", "低立领≤3cm", "正式场合", "偏门襟"]
  },
  {
    id: "CASE-SF-02",
    title: "案例二：海派宋锦梅花星光暗纹青果领女式正式外套",
    sourceType: "上服集团官方真实案例 (2026.11)",
    mode: "bespoke",
    customerRawQuote:
      "想要定制一件外套，风格偏中式一些，适合正式场合穿着，领子不要太高，要窄一点，显得脖子细一些。整体宽松舒展一点，我里面要搭配一件内搭，面料要带一些暗纹，最好是梅花，要显得优雅一些。",
    translation: {
      category: "外套",
      structure: "H 型直身结构，微微收腰；肩型采用微落平肩，线条简约利落",
      collar: "青果西装领，领型线条柔和舒展",
      fabric: "优选垂感适中、手感柔和提花宋锦面料，垂感顺滑，自带柔和光泽，挺而不硬",
      color: "无特殊需求",
      patternCraft: "衣身植物暗花纹样（梅花意象），点缀细碎点状星光装饰，含蓄富有层次",
      lengthRatio: "衣长至臀中位置",
      easeAllowance: "整体围度宽松，预留内搭叠穿余量，活动自在无束缚紧绷感"
    },
    matchedPatternId: "PAT-SF-02",
    matchedFabricId: "FAB-SF-01",
    matchedCraftIds: ["CRF-05"],
    images: [
      { url: "/cases/shangfu/image3.jpeg", caption: "案例二女模叠穿内搭上身效果图", stage: "上身效果" },
      { url: "/cases/shangfu/image4.jpeg", caption: "案例二宋锦梅花星光青果领外套实物挂拍图", stage: "实拍成衣" }
    ],
    expertTakeaway:
      "希望“显脖子细长+配内搭”时，放弃传统立领改用窄版青果西装领形成纵向窄 V 视错觉；提花宋锦叠加微星光纬线兼顾正式度与女性柔美层次。",
    tags: ["显脖细长", "青果西装领", "提花宋锦", "梅花暗纹", "女性正式装"]
  },
  {
    id: "CASE-SF-03",
    title: "案例三：户外舞台器乐演奏两件式套装（宋锦短外套+亮缎大摆裙）",
    sourceType: "上服集团官方真实案例 (2026.11)",
    mode: "bespoke",
    customerRawQuote:
      "想定制一套演出服，要有一件连衣裙和一件外套，整体风格优雅一些，在户外舞台要有氛围感；演奏时抬手、坐奏都要方便，腰部要宽松一点，色彩要明快有活力，上镜效果要好，兼顾正式感与松弛感。",
    translation: {
      category: "两件式套装（短外套+无袖连衣裙）",
      structure: "外套：短款微H型，肩型自然平肩，不压肩；连衣裙：收腰大A摆结构，腰腹保留松量，裙摆舒展",
      collar: "外套：中式斜襟领，线条柔和；连衣裙：简约小圆领，贴合颈部不卡肩",
      fabric: "外套：暗纹宋锦+真丝里布，穿着舒适；连衣裙：高垂感亮面缎面，顺滑有光泽，走动自带垂坠弧度",
      color: "米白底色外套，搭配亮粉色滚边与撞色袖口；连衣裙同亮粉色",
      patternCraft: "中式斜襟一字盘扣配同色长流苏吊穗，宽幅翻折撞色袖口",
      lengthRatio: "外套衣长至臀中位置；连衣裙裙长至脚踝",
      easeAllowance: "外套袖管放量充足，抬臂演奏无束缚；连衣裙腰部适度收束，裙摆放量大，坐奏舒展不紧绷"
    },
    matchedPatternId: "PAT-SF-03",
    matchedFabricId: "FAB-SF-05",
    matchedCraftIds: ["CRF-02", "CRF-09"],
    images: [
      { url: "/cases/shangfu/image5.jpeg", caption: "案例三银米白暗纹宋锦撞色斜襟流苏外套实物图", stage: "实拍成衣" },
      { url: "/cases/shangfu/image6.jpeg", caption: "案例三亮粉高垂感亮面缎工字褶大A摆长裙实物图", stage: "实拍成衣" }
    ],
    expertTakeaway:
      "动态演奏/礼仪场景必须把动作工程学写入版型余量：抬臂靠袖管加肥与低袖山，坐奏靠高腰适度松量与工字褶大 A 摆；上镜效果靠高垂亮面缎与袖口撞色提亮。",
    tags: ["舞台演出服", "两件式套装", "抬臂坐奏放量", "撞色滚边流苏", "高上镜度"]
  },
  {
    id: "CASE-SF-04",
    title: "案例四：内敛低调非遗香云纱外套（溜肩与小肚腩修饰）",
    sourceType: "上服集团官方真实案例 (2026.11)",
    mode: "bespoke",
    customerRawQuote:
      "要定制一件能体现中式服装特点的外套，风格内敛简约，整体低调一些。领子不要太高，显得脖子长一点，我有一点溜肩，还有小肚腩，希望肩部能做的舒展一点方便活动，衣服整体也要宽松一些",
    translation: {
      category: "外套",
      structure: "H型直身结构，无收腰；肩型采用自然落肩，线条柔和松弛",
      collar: "低立领（领高控制在 3cm 以内），领线条圆润",
      fabric: "香云纱面料，自带自然肌理，哑光温润，挺而不硬，垂感柔和",
      color: "无特殊需求",
      patternCraft: "无特殊需求",
      lengthRatio: "衣长至臀中位置",
      easeAllowance: "前片腹部区域预留充足松量，整体围度宽松，穿着无束缚"
    },
    matchedPatternId: "PAT-SF-04",
    matchedFabricId: "FAB-SF-02",
    matchedCraftIds: ["CRF-03"],
    images: [
      { url: "/cases/shangfu/image7.jpeg", caption: "案例四非遗香云纱极细红棕嵌条外套实物挂拍图", stage: "实拍成衣" },
      { url: "/cases/shangfu/image8.jpeg", caption: "案例四成熟男士自然落肩上身穿搭效果图", stage: "上身效果" }
    ],
    expertTakeaway:
      "针对溜肩客户若强塞厚垫肩反而显得僵硬不自然，采用自然落肩配合重磅香云纱自身的微挺筋骨感，可呈现内敛松弛的东方文人气质。",
    tags: ["非遗香云纱", "溜肩修饰", "肚腩放量", "内敛低调", "极细嵌条"]
  },
  {
    id: "CASE-SF-05",
    title: "案例五：徽派马头墙阶梯撞色肌理针织商务新中式外套",
    sourceType: "上服集团官方真实案例 (2026.11)",
    mode: "bespoke",
    customerRawQuote:
      "想要定制一件新中式外套，整体有质感一些，偏商务风格，我喜欢立领款式，但不要过高卡脖子，面料带有肌理感，最好是撞色，显得穿搭有层次一些，休闲显气质。我是安徽人，能不能有些地域特色。",
    translation: {
      category: "外套",
      structure: "H 型直身结构，无收腰；肩型采用微落平肩，线条简约利落",
      collar: "低立领（领高控制在 3cm 以内），领线条圆润",
      fabric: "采用肌理提花针织面料，质感柔软，触感柔和",
      color: "粉墙浅灰与黛瓦炭黑阶梯撞色",
      patternCraft: "暗纹+立体菱格肌理，肩胸阶梯分割体现徽派马头墙建筑风格",
      lengthRatio: "衣长至臀中位置",
      easeAllowance: "整体围度宽松，衣身放量充足，穿着舒展不贴身"
    },
    matchedPatternId: "PAT-SF-05",
    matchedFabricId: "FAB-SF-06",
    matchedCraftIds: ["CRF-04"],
    images: [
      { url: "/cases/shangfu/image9.png", caption: "案例五徽派马头墙阶梯撞色上身穿搭效果图", stage: "上身效果" },
      { url: "/cases/shangfu/image10.jpeg", caption: "案例五肌理提花针织撞色外套实物挂拍图", stage: "实拍成衣" }
    ],
    expertTakeaway:
      "地域/企业文化诉求忌生硬印贴图案，将其抽象为结构分割线（马头墙阶梯拼接）与色彩哲学（粉墙黛瓦），既有文化温度又符合现代高级商务审美。",
    tags: ["地域文化转译", "徽派马头墙", "阶梯撞色", "肌理提花针织", "商务休闲"]
  },
  {
    id: "CASE-SF-06",
    title: "案例六：简约大气真丝暗纹无扣交领外套（宽厚肩背六步全流程标杆）",
    sourceType: "上服集团官方真实案例 (2026.11)",
    mode: "bespoke",
    customerRawQuote:
      "想要定制一件外套，想要简约大气的新中式风格，正式一些。我身形偏高，肩背比较宽厚，希望版型不要压肩、不卡手臂，整体宽松一些，不要束缚感，质感要好一些，显得人有气质一点。",
    translation: {
      category: "外套",
      structure: "H 型直身结构，无收腰；肩型采用微落平肩，线条简约利落",
      collar: "交领开襟款式，无立领，领型线条柔和舒展",
      fabric: "优选真丝暗纹织花面料，垂感适中，手感柔和，挺而不硬，穿着舒适不易贴身",
      color: "无特殊需求",
      patternCraft: "暗花小巧，低调含蓄，无外露纽扣装饰",
      lengthRatio: "衣长至臀中位置",
      easeAllowance: "整体围度宽松，肩背、袖管放量充足，抬手、站立活动自在无紧绷"
    },
    matchedPatternId: "PAT-SF-06",
    matchedFabricId: "FAB-SF-03",
    matchedCraftIds: ["CRF-01"],
    images: [
      { url: "/cases/shangfu/image13.png", caption: "步骤2&3：设计效果图与面料图案细节四分区企划板", stage: "设计企划板" },
      { url: "/cases/shangfu/image14.png", caption: "步骤4：富怡/ET CAD 10裁片制版图与6条工艺说明", stage: "CAD制版" },
      { url: "/cases/shangfu/image15.png", caption: "步骤5：初样胚布样衣正背面挂拍核对图", stage: "初样白坯" },
      { url: "/cases/shangfu/image11.jpeg", caption: "步骤6：宽肩高大男模成衣上身效果图", stage: "上身效果" },
      { url: "/cases/shangfu/image12.jpeg", caption: "步骤6：成衣单品挂拍交付图", stage: "实拍成衣" }
    ],
    expertTakeaway:
      "上服完整六步工作流（转化→设计图→选面料→CAD制版→打样→成衣）黄金范本：高大宽肩体态通过无立领交领卸除颈肩压迫感，在富怡/ET制版阶段针对肩线与袖笼定向放量。",
    tags: ["六步工作流标杆", "宽肩高大体态", "交领无扣", "重磅真丝暗纹", "CAD制版规范"]
  },
  {
    id: "CASE-UNI-01",
    title: "团装案例七：陆家嘴外资私人银行旗舰中心 35 人三级海派职业服企划",
    sourceType: "上服团装模拟归档案例",
    mode: "uniform",
    customerRawQuote:
      "我们是上海陆家嘴新设立的私人银行财富中心，一共 35 名员工，包括 5 位中心高管、22 位男女理财顾问和 8 位贵宾厅礼仪迎宾。想要一套既有上海海派东方底蕴、又符合国际金融专业信任感的四季职业服。品牌主色是深海藏青配香槟金，不要把大 Logo 印在外面像酒店工服；员工每天久坐开会见客必须极度抗皱好打理，后续新员工入职补单不能有色差，里面还有几位偏胖和宽肩同事需要合身照顾。",
    translation: {
      category: "企业三级同源团体职业服套装（高管行政款 / 顾问商务款 / 迎宾礼仪套裙）",
      structure: "高管采用微立领合体 H 型；顾问采用窄驳领高活动量西装型；迎宾采用云肩弧线短外套+微A过膝裙",
      collar: "同源海派领型家族：高管 2.6cm 缺角微立领 / 顾问东方折角窄青果驳领 / 迎宾温婉偏斜襟低立领",
      fabric: "主料优选 Super 110s 高支抗皱美丽奴羊毛混纺呢（跨批次补单 ΔE<0.8）；女装内搭与礼仪裙配永久抗静电可水洗玉兰暗纹三醋酸职业缎",
      color: "主色深海藏青，辅以 1.5mm 香槟金极细内敛滚边与玉兰白内搭提亮",
      patternCraft: "内门襟香槟金品牌色包边、左驳头电脑精锁海派如意徽章扣眼（免伤面料）、袖口末粒暗金锁眼、白玉兰同色暗纹内搭",
      lengthRatio: "男款臀中偏下 / 女顾问臀中配九分微弹西裤 / 迎宾短款上衣配过膝 5cm A字裙",
      easeAllowance: "国标号型覆盖 30 人（西裤设 ±2cm 隐形腰调），5 位宽肩/腹围特体员工启用胁片预留 2.0cm 缝份单量微调"
    },
    matchedPatternId: "PAT-UNI-01",
    matchedFabricId: "FAB-UNI-01",
    matchedCraftIds: ["CRF-03", "CRF-06", "CRF-08"],
    images: [
      { url: "/generated/lookbook-bank.jpg", caption: "陆家嘴私行三级岗位同源海派职业服团队形象效果图", stage: "上身效果" },
      { url: "/generated/dir-bank-a.jpg", caption: "高管缺角微立领深海藏青精纺呢成衣效果图", stage: "实拍成衣" },
      { url: "/generated/dir-bank-b.jpg", caption: "迎宾斜襟香槟金 1.5mm 细滚边短外套效果图", stage: "实拍成衣" },
      { url: "/generated/asset-crf-08.jpg", caption: "内门襟香槟金包边与左驳头如意扣眼工艺微距", stage: "设计企划板" }
    ],
    expertTakeaway:
      "团体职业服破局关键在于「同源基因、三级配置」：用统一的深海蓝精纺呢 + 1.5mm 香槟金嵌条 + 如意徽章扣眼串联全员家族感，同时区分高管权威感、顾问久坐抗皱性与迎宾亲和度，并以标准号型+特体单量平衡成本与合体度。",
    tags: ["金融团装", "三级岗位矩阵", "企业VI内敛植入", "高抗皱零色差补单", "标准号型+特体"]
  },
  {
    id: "CASE-UNI-02",
    title: "团装案例八：上海海派文化艺术馆 28 人公教讲解与行政接待团装",
    sourceType: "上服团装模拟归档案例",
    mode: "uniform",
    customerRawQuote:
      "馆里即将举办年度江南海派特展，需要为 28 名公教讲解员和展厅主管定制一套新中式工作制服。展厅引导每天步数过万且需要频繁抬手讲解，衣服必须轻便有弹性、机洗免烫不起球；风格要有江南书卷气和建筑线条感，低调雅致不抢展品风头。",
    translation: {
      category: "文博展馆团体职业服（主管阶梯撞色立领夹克 + 讲解员斜襟轻便套服）",
      structure: "H 型微松弛廓形，前胸融入建筑几何分割线条，配套微弹直筒西裤/过膝中长裙",
      collar: "2.5cm 舒适圆角低立领 / 柔和斜襟领（久讲一天不磨颈部）",
      fabric: "索罗娜生物基弹力微肌理斜纹呢（机洗免烫、久弯不鼓包）配抗静电三醋酸内搭",
      color: "宣纸米灰拼水墨炭灰（低饱和度书卷色系，不干扰展品灯光色彩）",
      patternCraft: "江南建筑阶梯几何分割拼接 + 侧开衩内挡布工艺 + 免别针磁吸/如意扣眼工牌位",
      lengthRatio: "上衣至臀中偏上利落比例，下装九分裤/过膝裙便于快步行走",
      easeAllowance: "袖笼与后背预留大幅度抬手讲解活动松量，全员支持 5 件起快反补单"
    },
    matchedPatternId: "PAT-UNI-02",
    matchedFabricId: "FAB-UNI-03",
    matchedCraftIds: ["CRF-01", "CRF-04", "CRF-08"],
    images: [
      { url: "/cases/shangfu/image9.png", caption: "水墨灰阶建筑分割立领职业夹克上身参考", stage: "上身效果" },
      { url: "/cases/shangfu/image10.jpeg", caption: "灰阶几何肌理拼接成衣质感参考", stage: "实拍成衣" },
      { url: "/generated/swatch-sorona-twill.jpg", caption: "索罗娜生物基弹力微肌理斜纹呢灰阶色卡", stage: "设计企划板" }
    ],
    expertTakeaway:
      "文博与高端服务业团装须兼顾“文化叙事低饱和度”与“日行万步机洗免烫”的高频实用主义，选用索罗娜生物基弹力呢替代难打理的天然真丝。",
    tags: ["文博场馆团装", "机洗免烫", "高频抬手行走", "低饱和水墨色", "建筑几何"]
  }
];

import { BusinessMode } from "@/lib/types";

export interface DemoPresetPrompt {
  id: string;
  mode: BusinessMode;
  badge: string;
  title: string;
  subtitle: string;
  promptText: string;
}

export const DEMO_PRESET_PROMPTS: DemoPresetPrompt[] = [
  {
    id: "PRESET-WEDDING-MOM",
    mode: "bespoke",
    badge: "婚礼母亲",
    title: "陈女士 · 婚礼旗袍外搭外套",
    subtitle: "酒红色、驼背、手臂粗、穿在旗袍外面",
    promptText:
      "我女儿下个月结婚，我想做一件穿在旗袍外面的外套，酒红色。我有点驼背，手臂也粗，想遮一下，但别太老气。",
  },
  {
    id: "PRESET-FORUM-BESPOKE",
    mode: "bespoke",
    badge: "私定外套",
    title: "外滩论坛主旨演讲外套",
    subtitle: "脖子偏短、微有肚腩、抬手互动",
    promptText:
      "下个月在上海外滩国际文化论坛主旨演讲，想定制一件海派正式外套。脖子偏短怕高领卡脖子，微有小肚腩不想紧绷，上台要举手互动，希望能含蓄融入上海白玉兰或江南细节。",
  },
  {
    id: "PRESET-BANK-UNIFORM",
    mode: "uniform",
    badge: "团体职业服",
    title: "陆家嘴私行 35 人三级职业服",
    subtitle: "三级岗位、深海蓝+香槟金、久坐抗皱",
    promptText:
      "上海陆家嘴私人银行 35 名员工（5位高管、22位男女理财顾问、8位贵宾迎宾），想要海派职业装。品牌色深海藏青配香槟金，不要胸前大Logo像工服；员工久坐必须抗皱耐打理、后续补单无色差，有5位宽肩或偏胖同事需要照顾。",
  },
];

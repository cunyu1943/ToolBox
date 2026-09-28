/**
 * 硬盘容量与分区方案。
 *
 * 两件事分开算：
 * 1) 厂商标称用十进制（1 TB = 10¹² 字节），Windows 按二进制 GiB 显示（1 GiB = 2³⁰ 字节），
 *    所以「买来的容量凭空少了 7%–9%」不是缩水，是单位口径不同，且容量越大差得越多（比例是 1000ᵏ/1024ᵏ）。
 * 2) 分区按占比拆分实际可用的 GiB，整数分配、余数补给最后一块；GiB 天然是 1 MiB 的整数倍，
 *    所以给出的起止 MiB 边界同时满足 4K 对齐，可直接抄进 diskpart / parted。
 */

export interface CapacityInfo {
  nominalGb: number
  bytes: number
  gib: number
  tib: number
  /** 显示出的 GiB 数值 ÷ 标称的 GB 数值（%）：GB→GiB 恒定约 93.13% */
  usablePct: number
  /** 标称 GB 数值与显示 GiB 数值之差，即用户感觉「少了多少」的那个数 */
  lostGb: number
  lostPct: number
}

const GB_DEC = 1e9
const GiB_BIN = 1024 ** 3

export function capacity(nominalGb: number): CapacityInfo {
  const bytes = Math.round(nominalGb * GB_DEC)
  const gib = bytes / GiB_BIN
  return {
    nominalGb,
    bytes,
    gib: Math.round(gib * 100) / 100,
    tib: Math.round((gib / 1024) * 10000) / 10000,
    usablePct: Math.round((gib / nominalGb) * 10000) / 100,
    lostGb: Math.round((nominalGb - gib) * 100) / 100,
    lostPct: Math.round(((nominalGb - gib) / nominalGb) * 10000) / 100
  }
}

export const COMMON_DISKS: { label: string; nominalGb: number }[] = [
  { label: '128 GB', nominalGb: 128 },
  { label: '256 GB', nominalGb: 256 },
  { label: '512 GB', nominalGb: 512 },
  { label: '1 TB', nominalGb: 1000 },
  { label: '2 TB', nominalGb: 2000 },
  { label: '4 TB', nominalGb: 4000 },
  { label: '8 TB', nominalGb: 8000 }
]

export interface PartitionSlice {
  label: string
  /** 百分比，0–100 */
  percent: number
}

export interface PartitionPreset {
  id: string
  name: string
  desc: string
  slices: PartitionSlice[]
}

/** 常见用途预设，占比之和均为 100 */
export const DISK_PRESETS: PartitionPreset[] = [
  {
    id: 'balanced',
    name: '均衡通用',
    desc: '系统与日常使用并重',
    slices: [
      { label: '系统盘 (C)', percent: 30 },
      { label: '软件与工作 (D)', percent: 40 },
      { label: '娱乐与备份 (E)', percent: 30 }
    ]
  },
  {
    id: 'office',
    name: '办公文档',
    desc: '系统精简、文档空间充裕',
    slices: [
      { label: '系统盘 (C)', percent: 25 },
      { label: '文档办公 (D)', percent: 55 },
      { label: '其他 (E)', percent: 20 }
    ]
  },
  {
    id: 'gaming',
    name: '游戏娱乐',
    desc: '为大型游戏预留主分区',
    slices: [
      { label: '系统盘 (C)', percent: 25 },
      { label: '游戏 (D)', percent: 60 },
      { label: '影音 (E)', percent: 15 }
    ]
  },
  {
    id: 'dev',
    name: '开发设计',
    desc: '为工具链、镜像与工程预留空间',
    slices: [
      { label: '系统盘 (C)', percent: 30 },
      { label: '开发环境 (D)', percent: 45 },
      { label: '资料归档 (E)', percent: 25 }
    ]
  },
  {
    id: 'media',
    name: '影音存储',
    desc: '大容量媒体分区为主',
    slices: [
      { label: '系统盘 (C)', percent: 15 },
      { label: '影音库 (D)', percent: 75 },
      { label: '临时 (E)', percent: 10 }
    ]
  },
  {
    id: 'linux',
    name: 'Linux 双系统',
    desc: 'EFI 与 swap 单列，根分区独立',
    slices: [
      { label: 'EFI 系统分区', percent: 1 },
      { label: 'swap', percent: 5 },
      { label: '根分区 /', percent: 44 },
      { label: '家目录 /home', percent: 50 }
    ]
  }
]

export interface PartitionRow {
  label: string
  percent: number
  /** 整数 GiB */
  sizeGiB: number
  /** 换算成十进制 GB，和厂商标称同一口径，便于和商品页对照 */
  sizeGbDec: number
  /** 对齐后的起始位置（MiB） */
  startMiB: number
  endMiB: number
}

export type DiskFs = 'ntfs' | 'ext4' | 'apfs' | 'raw'

export interface DiskInput {
  nominalGb: number
  slices: PartitionSlice[]
  /** ext4 默认为 root 保留 5%；NTFS 无此机制 */
  fs: DiskFs
}

export interface DiskResult {
  ok: boolean
  error?: string
  capacity: CapacityInfo
  totalGiB: number
  rows: PartitionRow[]
  /** 占比合计，用于提示是否等于 100 */
  percentSum: number
  /** 文件系统 overhead：ext4 的 5% 保留块，按最后一个分区举例 */
  reservedGiB: number | null
  notes: string[]
}

const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** 按占比把 totalGiB 拆成整数分区，余数补给最后一块，保证合计等于总容量 */
export function allocate(totalGiB: number, slices: PartitionSlice[]): PartitionRow[] {
  const total = Math.max(0, Math.floor(totalGiB))
  const rows: PartitionRow[] = []
  let assigned = 0
  let cursorMiB = 0
  for (let index = 0; index < slices.length; index++) {
    const slice = slices[index] as PartitionSlice
    const isLast = index === slices.length - 1
    const raw = isLast ? total - assigned : Math.floor((total * slice.percent) / 100)
    const sizeGiB = Math.max(0, raw)
    if (!isLast) assigned += sizeGiB
    // GiB 本身就是 1 MiB 的整数倍，所以按整数 GiB 切分天然落在 1 MiB 边界上（4K 对齐）
    const startMiB = cursorMiB
    const endMiB = startMiB + sizeGiB * 1024
    rows.push({
      label: slice.label,
      percent: slice.percent,
      sizeGiB,
      sizeGbDec: round((sizeGiB * GiB_BIN) / GB_DEC, 2),
      startMiB,
      endMiB
    })
    cursorMiB = endMiB
  }
  return rows
}

export function computeDisk(input: DiskInput): DiskResult {
  const empty: DiskResult = {
    ok: false,
    capacity: capacity(0),
    totalGiB: 0,
    rows: [],
    percentSum: 0,
    reservedGiB: null,
    notes: []
  }
  if (!Number.isFinite(input.nominalGb) || input.nominalGb <= 0) {
    return { ...empty, error: '标称容量要大于 0（按 GB 或 TB 的十进制数字输入）。' }
  }
  if (input.nominalGb > 100000) {
    return { ...empty, error: '标称容量超过 100 TB，检查一下是不是把 GB 当成了 TB。' }
  }
  if (!input.slices.length) {
    return { ...empty, error: '至少需要一个分区。' }
  }
  for (const slice of input.slices) {
    if (!Number.isFinite(slice.percent) || slice.percent < 0 || slice.percent > 100) {
      return { ...empty, error: `「${slice.label || '未命名分区'}」的占比需要是 0–100 的数字。` }
    }
    if (!slice.label.trim()) {
      return { ...empty, error: '分区名称不能为空。' }
    }
  }
  const percentSum = round(
    input.slices.reduce((sum, slice) => sum + slice.percent, 0),
    2
  )
  if (Math.abs(percentSum - 100) > 0.01) {
    return { ...empty, error: `各分区占比合计是 ${percentSum}%，需要正好等于 100% 才能把盘分完。` }
  }

  const info = capacity(input.nominalGb)
  const totalGiB = Math.floor(info.gib)
  const rows = allocate(info.gib, input.slices)

  const notes: string[] = []
  notes.push(
    `${input.nominalGb} GB 标称 = ${info.bytes.toLocaleString('en-US')} 字节，Windows 显示为 ${info.gib} GiB${info.gib >= 1024 ? `（约 ${info.tib} TiB）` : ''}，比标称少 ${info.lostPct}%。这不是缩水：厂商按 1000 进制、系统按 1024 进制。GB 与 GiB 之间是三个 1000/1024 的台阶，所以固定少 6.87%；单位越大差得越多 —— 1 TB 与 1 TiB 差 9.05%，1 PB 与 1 PiB 差 11.18%。`
  )
  const last = rows[rows.length - 1]
  if (last) {
    const nominal = Math.floor((totalGiB * last.percent) / 100)
    if (last.sizeGiB !== nominal) {
      notes.push(`最后一块分区吃下了前面各块向下取整剩下的余数：按 ${last.percent}% 应是 ${nominal} GiB，实际拿到 ${last.sizeGiB} GiB，合计正好等于整盘。`)
    }
  }
  if (input.fs === 'ext4') {
    notes.push('ext4 默认为 root 保留 5% 空间（`tune2fs -m`），所以「df 看到的可用」还会再少一截；纯数据盘可以把保留比例调到 0%。')
  }
  if (input.fs === 'ntfs') {
    notes.push('NTFS 默认簇 4 KiB（≤16 TiB 卷）：存大量小文件时实际占用按簇向上取整，几 KB 的文件也会占满一整个簇。')
  }
  if (input.fs === 'apfs') {
    notes.push('APFS 支持克隆与快照，系统卷与数据卷共享同一容器空间，「分区」在这套文件系统里通常不如「容器 + 快照」划算。')
  }
  notes.push('分区数限制：MBR 只能 4 个主分区（或 3 主 + 1 扩展），且单盘寻址上限 2 TiB；GPT 由 Windows 实现限制为 128 个，UEFI 启动必须有 EFI 系统分区（一般 100–500 MiB）。')
  if (totalGiB >= 100) {
    notes.push('系统盘预留：Windows 更新、临时文件与休眠文件（约等于物理内存大小）都落在 C 盘，长期只给 30 GB 以下的系统盘会反复清理空间。')
  }

  return {
    ok: true,
    capacity: info,
    totalGiB,
    rows,
    percentSum,
    reservedGiB: input.fs === 'ext4' ? round((last?.sizeGiB ?? 0) * 0.05) : null,
    notes
  }
}

export const FS_LABELS: { value: DiskInput['fs']; label: string }[] = [
  { value: 'ntfs', label: 'NTFS（Windows）' },
  { value: 'ext4', label: 'ext4（Linux）' },
  { value: 'apfs', label: 'APFS（macOS）' },
  { value: 'raw', label: '未格式化 / 其他' }
]

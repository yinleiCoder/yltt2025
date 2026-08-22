# 个人资料出生日期与年龄展示

## 目标

在个人资料页增加出生日期字段和公开开关。出生日期以完整日期（年-月-日）保存；其他用户查看公开资料时，只能看到根据当前日期计算出的年龄，不返回具体出生日期。

## 设计

### 数据模型与数据库投影

- `public.profiles` 新增 `birth_date date`，允许为空。
- `public.profiles` 新增 `public_birth_date boolean not null default false`。
- 认证用户可更新这两个字段，沿用现有 `profiles` 行级权限。
- `get_public_profiles(uuid[])` 的返回结构新增 `age integer`，仅在 `public_birth_date` 为真且出生日期非空时返回 `extract(year from age(current_date, birth_date))`，否则返回 SQL `null`。
- RPC 不返回 `birth_date`，保持生日不离开受保护的个人资料读取链路。

### 应用层

- `ProfileDraft` 增加可选出生日期和公开开关；日期输入使用 `YYYY-MM-DD`，空值归一化为 `null`，未来日期或无效日期校验失败。
- 当前用户资料服务读取和返回 `birthDate`、`publicBirthDate`，Server Action 保存对应列。
- 资料表单增加日期输入和“公开出生年月”开关，并显示隐私说明。
- `PublicProfile` 增加可选 `age`；公共资料对话框显示“年龄”，不显示出生日期。
- 年龄计算由数据库 RPC 完成，避免客户端时区造成边界差异；应用层仅负责类型映射。

### 错误与兼容性

- 旧用户的两个新字段使用默认值和空值，不影响已有资料。
- 数据库字段未部署时，沿用现有数据库结构错误提示。
- 公共资料没有公开出生日期、日期为空或年龄无效时，不显示年龄；若没有其他公开字段，继续显示“该用户暂未公开更多资料”。

## 测试

- 日期 schema：接受合法日期，空值归一化为 `null`，拒绝无效或未来日期。
- 公共资料投影：公开年龄保留，关闭开关或空生日不暴露年龄；源对象中的生日字段不进入公共结果。
- 资料表单/服务契约：新字段被读取、提交和更新。
- SQL 迁移契约：新增列、授权、RPC 返回 `age` 并使用 `current_date` 计算，且不返回 `birth_date`。
- 运行完整 Vitest、TypeScript 类型检查和 Next 构建。

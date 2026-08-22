import { describe, expect, it } from "vitest";

import { validateProfileFormValues } from "./profile-form-validation";

describe("validateProfileFormValues", () => {
  it("拒绝空昵称", () => {
    expect(validateProfileFormValues({ displayName: " ", realName: "", phone: "", address: "", gender: "" })).toEqual({
      displayName: "请输入昵称。",
    });
  });

  it("拒绝超出最大长度的个人信息", () => {
    expect(
      validateProfileFormValues({
        displayName: "昵称",
        realName: "甲".repeat(81),
        phone: "",
        address: "",
        gender: "",
      }),
    ).toEqual({ realName: "真实姓名不能超过 80 个字符。" });
  });

  it("拒绝不受支持的性别值", () => {
    expect(validateProfileFormValues({ displayName: "昵称", realName: "", phone: "", address: "", gender: "prefer-not-to-say" })).toEqual({
      gender: "请选择有效的性别选项。",
    });
  });

  it("接受空白性别值，和服务端的 null 归一化保持一致", () => {
    expect(validateProfileFormValues({ displayName: "昵称", realName: "", phone: "", address: "", gender: " " })).toEqual({});
  });

  it("接受可提交的资料值", () => {
    expect(validateProfileFormValues({ displayName: "昵称", realName: "姓名", phone: "13800000000", address: "成都", gender: "female" })).toEqual({});
  });
});

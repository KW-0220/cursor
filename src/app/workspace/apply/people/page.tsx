"use client";

import { ApplyWizardShell } from "@/components/biz/apply-wizard-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useBizdoc } from "@/lib/bizdoc/client-store";
import { maskIdNumber } from "@/lib/bizdoc/completeness";
import type { BizDirector, BizShareholder, BizUbo } from "@/lib/bizdoc/types";

function newDirector(): BizDirector {
  return {
    id: `d-${Date.now()}`,
    nameZh: "",
    nameEn: "",
    idType: "hkid",
    idNumber: "",
    nationality: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    residenceCountry: "",
    isShareholder: false,
    sharePercent: "",
    isPrimaryContact: false,
  };
}

function newShareholder(): BizShareholder {
  return {
    id: `s-${Date.now()}`,
    name: "",
    type: "individual",
    sharePercent: "",
    isDirector: false,
    isUbo: false,
  };
}

function newUbo(): BizUbo {
  return {
    id: `u-${Date.now()}`,
    name: "",
    ownershipPercent: "",
    nationality: "",
    idType: "hkid",
    idNumber: "",
  };
}

export default function PeopleStepPage() {
  const { app, update, hydrated } = useBizdoc();
  if (!hydrated || !app.id) return null;

  return (
    <ApplyWizardShell stepId="people">
      <div className="mx-auto max-w-3xl space-y-10">
        <div>
          <h1 className="font-[family-name:var(--font-biz-display)] text-2xl font-semibold text-[color:var(--biz-forest-900)]">
            董事及股東
          </h1>
          <p className="mt-1 text-sm text-[color:var(--biz-muted)]">
            支援多位董事／股東、公司股東及最終實益擁有人；海外護照與地址均可填寫。
          </p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">董事列表</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                update((p) => ({
                  ...p,
                  directors: [...p.directors, newDirector()],
                }))
              }
            >
              新增董事
            </Button>
          </div>
          {app.directors.length === 0 && (
            <p className="rounded-xl border border-dashed border-[color:var(--biz-border)] px-4 py-8 text-center text-sm text-[color:var(--biz-muted)]">
              尚未新增董事
            </p>
          )}
          {app.directors.map((d, i) => (
            <div
              key={d.id}
              className="space-y-3 rounded-2xl border border-[color:var(--biz-border)] bg-[color:var(--biz-surface)] p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">董事 {i + 1}</p>
                <button
                  type="button"
                  className="text-xs text-danger-600"
                  onClick={() =>
                    update((p) => ({
                      ...p,
                      directors: p.directors.filter((x) => x.id !== d.id),
                    }))
                  }
                >
                  刪除
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="中文姓名">
                  <Input
                    value={d.nameZh}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id ? { ...x, nameZh: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="英文姓名" required>
                  <Input
                    value={d.nameEn}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id ? { ...x, nameEn: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="身份證明類型">
                  <Select
                    value={d.idType}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id
                            ? {
                                ...x,
                                idType: e.target.value as "hkid" | "passport",
                              }
                            : x,
                        ),
                      }))
                    }
                  >
                    <option value="hkid">香港身份證</option>
                    <option value="passport">護照</option>
                  </Select>
                </Field>
                <Field
                  label="身份證／護照號碼"
                  required
                  hint={d.idNumber ? `顯示遮罩：${maskIdNumber(d.idNumber)}` : undefined}
                >
                  <Input
                    value={d.idNumber}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id
                            ? { ...x, idNumber: e.target.value }
                            : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="國籍">
                  <Input
                    value={d.nationality}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id
                            ? { ...x, nationality: e.target.value }
                            : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="出生日期">
                  <Input
                    type="date"
                    value={d.dateOfBirth}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id
                            ? { ...x, dateOfBirth: e.target.value }
                            : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="電話" required>
                  <Input
                    value={d.phone}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id ? { ...x, phone: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="電郵">
                  <Input
                    value={d.email}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id ? { ...x, email: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="居住國家或地區">
                  <Input
                    value={d.residenceCountry}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id
                            ? { ...x, residenceCountry: e.target.value }
                            : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="持股比例（如適用）">
                  <Input
                    value={d.sharePercent || ""}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id
                            ? { ...x, sharePercent: e.target.value }
                            : x,
                        ),
                      }))
                    }
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={d.isShareholder}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) =>
                          x.id === d.id
                            ? { ...x, isShareholder: e.target.checked }
                            : x,
                        ),
                      }))
                    }
                  />
                  同時為股東
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={d.isPrimaryContact}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        directors: p.directors.map((x) => ({
                          ...x,
                          isPrimaryContact:
                            x.id === d.id ? e.target.checked : false,
                        })),
                      }))
                    }
                  />
                  主要聯絡人
                </label>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">股東列表</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                update((p) => ({
                  ...p,
                  shareholders: [...p.shareholders, newShareholder()],
                }))
              }
            >
              新增股東
            </Button>
          </div>
          {app.shareholders.map((s) => (
            <div
              key={s.id}
              className="grid gap-3 rounded-2xl border border-[color:var(--biz-border)] p-4 sm:grid-cols-2"
            >
              <Field label="股東姓名">
                <Input
                  value={s.name}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      shareholders: p.shareholders.map((x) =>
                        x.id === s.id ? { ...x, name: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="股東類型">
                <Select
                  value={s.type}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      shareholders: p.shareholders.map((x) =>
                        x.id === s.id
                          ? {
                              ...x,
                              type: e.target.value as "individual" | "company",
                            }
                          : x,
                      ),
                    }))
                  }
                >
                  <option value="individual">個人</option>
                  <option value="company">公司</option>
                </Select>
              </Field>
              <Field label="持股比例">
                <Input
                  value={s.sharePercent}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      shareholders: p.shareholders.map((x) =>
                        x.id === s.id
                          ? { ...x, sharePercent: e.target.value }
                          : x,
                      ),
                    }))
                  }
                />
              </Field>
              <div className="flex items-end gap-4 pb-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.isDirector}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        shareholders: p.shareholders.map((x) =>
                          x.id === s.id
                            ? { ...x, isDirector: e.target.checked }
                            : x,
                        ),
                      }))
                    }
                  />
                  是否董事
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.isUbo}
                    onChange={(e) =>
                      update((p) => ({
                        ...p,
                        shareholders: p.shareholders.map((x) =>
                          x.id === s.id
                            ? { ...x, isUbo: e.target.checked }
                            : x,
                        ),
                      }))
                    }
                  />
                  最終實益擁有人
                </label>
                <button
                  type="button"
                  className="ml-auto text-xs text-danger-600"
                  onClick={() =>
                    update((p) => ({
                      ...p,
                      shareholders: p.shareholders.filter((x) => x.id !== s.id),
                    }))
                  }
                >
                  刪除
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">最終實益擁有人</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                update((p) => ({ ...p, ubos: [...p.ubos, newUbo()] }))
              }
            >
              新增 UBO
            </Button>
          </div>
          {app.ubos.map((u) => (
            <div
              key={u.id}
              className="grid gap-3 rounded-2xl border border-[color:var(--biz-border)] p-4 sm:grid-cols-2"
            >
              <Field label="姓名">
                <Input
                  value={u.name}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      ubos: p.ubos.map((x) =>
                        x.id === u.id ? { ...x, name: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="擁有權比例">
                <Input
                  value={u.ownershipPercent}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      ubos: p.ubos.map((x) =>
                        x.id === u.id
                          ? { ...x, ownershipPercent: e.target.value }
                          : x,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="國籍">
                <Input
                  value={u.nationality}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      ubos: p.ubos.map((x) =>
                        x.id === u.id
                          ? { ...x, nationality: e.target.value }
                          : x,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="證件號碼">
                <Input
                  value={u.idNumber}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      ubos: p.ubos.map((x) =>
                        x.id === u.id ? { ...x, idNumber: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </Field>
            </div>
          ))}
        </section>
      </div>
    </ApplyWizardShell>
  );
}

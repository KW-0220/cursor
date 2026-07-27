"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import {
  Card,
  Disclaimer,
  SectionHeader,
  StateBanner,
} from "@/components/ui/layout";
import {
  OTHER_ASSET_SUBTYPES,
  REAL_ESTATE_SUBTYPES,
  analyzeCollateral,
  createCollateralItem,
  displayTitle,
  docSlotsForItem,
  itemCompleteness,
  lightLabel,
  preliminaryLtv,
  preliminaryNetValue,
  slotStatus,
  type CollateralCategory,
  type CollateralDocSlotId,
  type CollateralItem,
  type CollateralSubtype,
  type OtherAssetSubtype,
  type RealEstateSubtype,
  COLLATERAL_VALUATION_DISCLAIMER,
} from "@/lib/collateral";
import { formatHKD } from "@/lib/utils";

type Mode = "list" | "pick" | "edit" | "docs" | "analysis";

export function CollateralManager({
  items,
  onChange,
  newLoanAmount = 0,
  showDocs = true,
  showAnalysis = true,
}: {
  items: CollateralItem[];
  onChange: (next: CollateralItem[]) => void;
  newLoanAmount?: number;
  showDocs?: boolean;
  showAnalysis?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(items.length ? "list" : "pick");
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = useMemo(
    () => items.find((i) => i.id === editingId) ?? null,
    [items, editingId],
  );

  function upsert(item: CollateralItem) {
    const exists = items.some((i) => i.id === item.id);
    onChange(
      exists
        ? items.map((i) => (i.id === item.id ? item : i))
        : [...items, item],
    );
  }

  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setMode(items.length <= 1 ? "pick" : "list");
    }
  }

  function startAdd(category: CollateralCategory, subtype: CollateralSubtype) {
    const item = createCollateralItem(category, subtype);
    upsert(item);
    setEditingId(item.id);
    setMode("edit");
  }

  if (mode === "pick") {
    return (
      <div className="space-y-4">
        <SectionHeader
          title="選擇抵押品類型"
          subtitle="請選擇本次貸款擬提供的抵押品。系統會根據資產類型顯示相應文件要求。"
        />
        <Card>
          <p className="text-sm font-semibold text-navy-900">不動產</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {REAL_ESTATE_SUBTYPES.map((t) => (
              <button
                key={t}
                type="button"
                className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left text-sm font-medium text-navy-900"
                onClick={() => startAdd("real_estate", t)}
              >
                {t}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-navy-900">其他資產</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {OTHER_ASSET_SUBTYPES.map((t) => (
              <button
                key={t}
                type="button"
                className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left text-sm font-medium text-navy-900"
                onClick={() => startAdd("other_asset", t as OtherAssetSubtype)}
              >
                {t}
              </button>
            ))}
          </div>
        </Card>
        {items.length > 0 && (
          <Button
            fullWidth
            variant="outline"
            type="button"
            onClick={() => setMode("list")}
          >
            返回抵押品列表
          </Button>
        )}
      </div>
    );
  }

  if (mode === "edit" && editing) {
    return (
      <CollateralEditForm
        item={editing}
        onSave={(next) => {
          upsert({ ...next, updatedAt: new Date().toISOString() });
          setMode(showDocs ? "docs" : "list");
        }}
        onCancel={() => setMode("list")}
      />
    );
  }

  if (mode === "docs" && editing && showDocs) {
    return (
      <CollateralDocsEditor
        item={editing}
        onChange={(next) => {
          upsert({ ...next, updatedAt: new Date().toISOString() });
        }}
        onDone={() => setMode(showAnalysis ? "analysis" : "list")}
        onBack={() => setMode("edit")}
      />
    );
  }

  if (mode === "analysis" && editing && showAnalysis) {
    return (
      <div className="space-y-4">
        <CollateralAnalysisCard
          item={editing}
          newLoanAmount={newLoanAmount}
        />
        <Button fullWidth type="button" onClick={() => setMode("list")}>
          儲存並返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="多項抵押品管理"
        subtitle="可新增多於一項抵押品；每項獨立顯示文件完成度。"
      />
      {items.length === 0 ? (
        <StateBanner
          tone="warning"
          title="尚未新增抵押品"
          description="有抵押貸款需至少一項抵押品資料。"
        />
      ) : (
        items.map((item) => {
          const { done, total } = itemCompleteness(item);
          const slots = docSlotsForItem(item);
          return (
            <Card key={item.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-text-muted">{item.subtype}</p>
                  <p className="text-sm font-semibold text-navy-900">
                    {displayTitle(item)}
                  </p>
                </div>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular">
                  {done}／{total}
                </span>
              </div>
              <ul className="space-y-1 text-xs text-text-secondary">
                {slots.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span>{s.title}</span>
                    <span>{slotStatus(item, s)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-muted">
                初步淨值 {formatHKD(preliminaryNetValue(item))}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setEditingId(item.id);
                    setMode("docs");
                  }}
                >
                  查看／補交文件
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setEditingId(item.id);
                    setMode("edit");
                  }}
                >
                  編輯資料
                </Button>
                {showAnalysis && (
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setMode("analysis");
                    }}
                  >
                    初步分析
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  type="button"
                  onClick={() => remove(item.id)}
                >
                  刪除
                </Button>
              </div>
            </Card>
          );
        })
      )}
      <Button
        fullWidth
        variant="outline"
        type="button"
        onClick={() => setMode("pick")}
      >
        新增一項抵押品
      </Button>
      {items.length > 0 && showAnalysis && (
        <CollateralPortfolioSummary
          items={items}
          newLoanAmount={newLoanAmount}
        />
      )}
      <Disclaimer>
        共同必須文件（BR、NAR1、六個月月結、身份證明）仍須於文件步驟上載；此模組只處理抵押品專屬文件。
      </Disclaimer>
    </div>
  );
}

function CollateralEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: CollateralItem;
  onSave: (item: CollateralItem) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(item);

  return (
    <div className="space-y-4">
      <SectionHeader
        title={`${draft.subtype}基本資料`}
        subtitle="填寫後系統會顯示對應文件清單"
      />

      {draft.category === "real_estate" && draft.realEstate && (
        <>
          <Field label="物業類型">
            <Select
              value={draft.subtype}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  subtype: e.target.value as RealEstateSubtype,
                })
              }
            >
              {REAL_ESTATE_SUBTYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="物業地址" required>
            <Input
              value={draft.realEstate.address}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  realEstate: { ...draft.realEstate!, address: e.target.value },
                })
              }
              placeholder="請輸入物業地址"
            />
          </Field>
          <Field label="業權人" required>
            <Input
              value={draft.realEstate.owner}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  realEstate: { ...draft.realEstate!, owner: e.target.value },
                })
              }
            />
          </Field>
          <Field label="公司／個人持有" required>
            <Select
              value={draft.realEstate.holding}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  realEstate: {
                    ...draft.realEstate!,
                    holding: e.target.value as "公司" | "個人",
                  },
                })
              }
            >
              <option>公司</option>
              <option>個人</option>
            </Select>
          </Field>
          <Field label="估計市值（HKD）" required>
            <Input
              type="number"
              className="tabular"
              value={draft.realEstate.estimatedValue}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  realEstate: {
                    ...draft.realEstate!,
                    estimatedValue: e.target.value === "" ? "" : Number(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="現有按揭狀態" required>
            <Select
              value={draft.realEstate.hasExistingMortgage ? "仍有現有按揭" : "沒有現有按揭"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  realEstate: {
                    ...draft.realEstate!,
                    hasExistingMortgage: e.target.value === "仍有現有按揭",
                  },
                })
              }
            >
              <option>沒有現有按揭</option>
              <option>仍有現有按揭</option>
            </Select>
          </Field>
          {draft.realEstate.hasExistingMortgage && (
            <>
              <Field label="現有按揭銀行">
                <Input
                  value={draft.realEstate.mortgageBank}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      realEstate: {
                        ...draft.realEstate!,
                        mortgageBank: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="未償還餘額">
                  <Input
                    type="number"
                    className="tabular"
                    value={draft.realEstate.outstanding}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        realEstate: {
                          ...draft.realEstate!,
                          outstanding:
                            e.target.value === "" ? "" : Number(e.target.value),
                        },
                      })
                    }
                  />
                </Field>
                <Field label="每月供款">
                  <Input
                    type="number"
                    className="tabular"
                    value={draft.realEstate.monthlyPayment}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        realEstate: {
                          ...draft.realEstate!,
                          monthlyPayment:
                            e.target.value === "" ? "" : Number(e.target.value),
                        },
                      })
                    }
                  />
                </Field>
              </div>
            </>
          )}
          <Field label="出租狀態" required>
            <Select
              value={draft.realEstate.rentalStatus}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  realEstate: {
                    ...draft.realEstate!,
                    rentalStatus: e.target.value as
                      | "自用"
                      | "已出租"
                      | "空置",
                  },
                })
              }
            >
              <option>自用</option>
              <option>已出租</option>
              <option>空置</option>
            </Select>
          </Field>
          {draft.realEstate.rentalStatus === "已出租" && (
            <Field label="每月租金（HKD）">
              <Input
                type="number"
                className="tabular"
                value={draft.realEstate.monthlyRent}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    realEstate: {
                      ...draft.realEstate!,
                      monthlyRent:
                        e.target.value === "" ? "" : Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          )}
          <Card className="bg-surface-2">
            <p className="text-xs text-text-muted">初步物業淨值</p>
            <p className="mt-1 text-xl font-semibold tabular text-navy-900">
              {formatHKD(preliminaryNetValue(draft))}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              估計市值 − 現有按揭未償還餘額（初步計算）
            </p>
          </Card>
        </>
      )}

      {draft.subtype === "車輛" && draft.vehicle && (
        <>
          {(
            [
              ["車輛類型", "vehicleType"],
              ["車牌號碼", "plate"],
              ["品牌", "brand"],
              ["型號", "model"],
              ["首次登記年份", "firstRegYear"],
              ["登記車主", "registeredOwner"],
            ] as const
          ).map(([label, key]) => (
            <Field key={key} label={label} required={key === "plate" || key === "registeredOwner"}>
              <Input
                value={draft.vehicle![key]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    vehicle: { ...draft.vehicle!, [key]: e.target.value },
                  })
                }
              />
            </Field>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <Field label="購買價">
              <Input
                type="number"
                value={draft.vehicle.purchasePrice}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    vehicle: {
                      ...draft.vehicle!,
                      purchasePrice:
                        e.target.value === "" ? "" : Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
            <Field label="估計現值">
              <Input
                type="number"
                value={draft.vehicle.estimatedValue}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    vehicle: {
                      ...draft.vehicle!,
                      estimatedValue:
                        e.target.value === "" ? "" : Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          </div>
          <Field label="是否仍有車輛貸款">
            <Select
              value={draft.vehicle.hasLoan ? "是" : "否"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  vehicle: {
                    ...draft.vehicle!,
                    hasLoan: e.target.value === "是",
                  },
                })
              }
            >
              <option>否</option>
              <option>是</option>
            </Select>
          </Field>
          {draft.vehicle.hasLoan && (
            <Field label="現有貸款餘額">
              <Input
                type="number"
                value={draft.vehicle.outstanding}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    vehicle: {
                      ...draft.vehicle!,
                      outstanding:
                        e.target.value === "" ? "" : Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          )}
        </>
      )}

      {draft.subtype === "機器或設備" && draft.equipment && (
        <>
          {(
            [
              ["設備名稱", "name"],
              ["設備類型", "equipmentType"],
              ["品牌", "brand"],
              ["型號", "model"],
              ["序號", "serial"],
              ["購買日期", "purchaseDate"],
              ["設備所在地", "location"],
            ] as const
          ).map(([label, key]) => (
            <Field key={key} label={label} required={key === "name"}>
              <Input
                type={key === "purchaseDate" ? "date" : "text"}
                value={draft.equipment![key]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    equipment: { ...draft.equipment!, [key]: e.target.value },
                  })
                }
              />
            </Field>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <Field label="購買價">
              <Input
                type="number"
                value={draft.equipment.purchasePrice}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    equipment: {
                      ...draft.equipment!,
                      purchasePrice:
                        e.target.value === "" ? "" : Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
            <Field label="估計現值" required>
              <Input
                type="number"
                value={draft.equipment.estimatedValue}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    equipment: {
                      ...draft.equipment!,
                      estimatedValue:
                        e.target.value === "" ? "" : Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          </div>
          <Field label="是否仍有設備融資">
            <Select
              value={draft.equipment.hasFinance ? "是" : "否"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  equipment: {
                    ...draft.equipment!,
                    hasFinance: e.target.value === "是",
                  },
                })
              }
            >
              <option>否</option>
              <option>是</option>
            </Select>
          </Field>
          <Field label="是否已作其他抵押">
            <Select
              value={draft.equipment.pledgedElsewhere ? "是" : "否"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  equipment: {
                    ...draft.equipment!,
                    pledgedElsewhere: e.target.value === "是",
                  },
                })
              }
            >
              <option>否</option>
              <option>是</option>
            </Select>
          </Field>
          <Disclaimer>
            設備照片不可作為正式價值證明，只可協助識別及人工覆核。
          </Disclaimer>
        </>
      )}

      {draft.subtype === "定期存款" && draft.timeDeposit && (
        <>
          <Field label="銀行名稱" required>
            <Input
              value={draft.timeDeposit.bankName}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  timeDeposit: {
                    ...draft.timeDeposit!,
                    bankName: e.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label="存款戶口持有人" required>
            <Input
              value={draft.timeDeposit.accountHolder}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  timeDeposit: {
                    ...draft.timeDeposit!,
                    accountHolder: e.target.value,
                  },
                })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="本金" required>
              <Input
                type="number"
                value={draft.timeDeposit.principal}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    timeDeposit: {
                      ...draft.timeDeposit!,
                      principal:
                        e.target.value === "" ? "" : Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
            <Field label="貨幣">
              <Input
                value={draft.timeDeposit.currency}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    timeDeposit: {
                      ...draft.timeDeposit!,
                      currency: e.target.value,
                    },
                  })
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="起息日期">
              <Input
                type="date"
                value={draft.timeDeposit.startDate}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    timeDeposit: {
                      ...draft.timeDeposit!,
                      startDate: e.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="到期日">
              <Input
                type="date"
                value={draft.timeDeposit.maturityDate}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    timeDeposit: {
                      ...draft.timeDeposit!,
                      maturityDate: e.target.value,
                    },
                  })
                }
              />
            </Field>
          </div>
          <Field label="利率">
            <Input
              value={draft.timeDeposit.rate}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  timeDeposit: { ...draft.timeDeposit!, rate: e.target.value },
                })
              }
              placeholder="例如 3.2%"
            />
          </Field>
          <Field label="是否已作其他質押">
            <Select
              value={draft.timeDeposit.pledgedElsewhere ? "是" : "否"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  timeDeposit: {
                    ...draft.timeDeposit!,
                    pledgedElsewhere: e.target.value === "是",
                  },
                })
              }
            >
              <option>否</option>
              <option>是</option>
            </Select>
          </Field>
        </>
      )}

      {draft.subtype === "股票或證券" && draft.securities && (
        <>
          <Field label="證券公司或銀行" required>
            <Input
              value={draft.securities.brokerName}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  securities: {
                    ...draft.securities!,
                    brokerName: e.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label="戶口持有人" required>
            <Input
              value={draft.securities.accountHolder}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  securities: {
                    ...draft.securities!,
                    accountHolder: e.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label="戶口號碼末四位">
            <Input
              value={draft.securities.accountLast4}
              maxLength={4}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  securities: {
                    ...draft.securities!,
                    accountLast4: e.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label="資產類型">
            <Input
              value={draft.securities.assetType}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  securities: {
                    ...draft.securities!,
                    assetType: e.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label="估計市值" required>
            <Input
              type="number"
              value={draft.securities.estimatedValue}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  securities: {
                    ...draft.securities!,
                    estimatedValue:
                      e.target.value === "" ? "" : Number(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="是否存在孖展融資">
            <Select
              value={draft.securities.hasMargin ? "是" : "否"}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  securities: {
                    ...draft.securities!,
                    hasMargin: e.target.value === "是",
                  },
                })
              }
            >
              <option>否</option>
              <option>是</option>
            </Select>
          </Field>
          {draft.securities.hasMargin && (
            <Field label="現有融資餘額">
              <Input
                type="number"
                value={draft.securities.marginOutstanding}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    securities: {
                      ...draft.securities!,
                      marginOutstanding:
                        e.target.value === "" ? "" : Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          )}
          <Disclaimer>
            AI 只可提取月結單上市值，不應視為正式可質押價值。正式可借金額須考慮最新市價、認可清單、折扣率、波動、集中度、流動性及現有孖展。
          </Disclaimer>
        </>
      )}

      {draft.subtype === "其他資產" && (
        <StateBanner
          tone="info"
          title="其他資產"
          description="請於下一步上載可證明業權及價值的文件；顧問會按個案確認要求。"
        />
      )}

      <div className="space-y-2">
        <Button fullWidth type="button" onClick={() => onSave(draft)}>
          儲存並繼續
        </Button>
        <Button fullWidth variant="outline" type="button" onClick={onCancel}>
          返回
        </Button>
      </div>
    </div>
  );
}

function CollateralDocsEditor({
  item,
  onChange,
  onDone,
  onBack,
}: {
  item: CollateralItem;
  onChange: (item: CollateralItem) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const slots = docSlotsForItem(item);
  const { done, total } = itemCompleteness(item);
  const re = item.realEstate;

  function addFile(slotId: CollateralDocSlotId, file: File) {
    const meta = {
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    };
    const prev = item.files[slotId] ?? [];
    onChange({
      ...item,
      files: { ...item.files, [slotId]: [...prev, meta] },
    });
  }

  function clearSlot(slotId: CollateralDocSlotId) {
    const nextFiles = { ...item.files };
    delete nextFiles[slotId];
    onChange({ ...item, files: nextFiles });
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={
          item.category === "real_estate"
            ? "不動產抵押文件"
            : "其他資產抵押文件"
        }
        subtitle={displayTitle(item)}
      />

      {re && (
        <Card className="space-y-1 text-sm">
          <Row label="物業類型" value={item.subtype} />
          <Row label="物業地址" value={re.address || "—"} />
          <Row label="業權人" value={re.owner || "—"} />
          <Row
            label="估計市值"
            value={
              re.estimatedValue === ""
                ? "—"
                : formatHKD(Number(re.estimatedValue))
            }
          />
          <Row
            label="現有按揭"
            value={re.hasExistingMortgage ? "仍有現有按揭" : "沒有"}
          />
          <Row label="出租狀態" value={re.rentalStatus} />
          <Row label="文件完成度" value={`${done}／${total}`} />
        </Card>
      )}

      {!re && (
        <StateBanner
          tone="info"
          title={`文件完成度 ${done}／${total}`}
          description={item.subtype}
        />
      )}

      {slots.map((slot) => {
        const files = item.files[slot.id] ?? [];
        return (
          <Card key={slot.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-navy-900">
                  {slot.title}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">{slot.accept}</p>
                {slot.conditionHint && (
                  <p className="mt-0.5 text-xs text-teal-800">
                    條件：{slot.conditionHint}
                  </p>
                )}
              </div>
              <span className="text-xs">
                {slot.level === "required" ? "必須" : "建議"}
              </span>
            </div>
            {files.length > 0 ? (
              <ul className="space-y-1 text-xs text-text-secondary">
                {files.map((f) => (
                  <li key={f.name + f.uploadedAt}>· {f.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-danger-600">尚未上載</p>
            )}
            <div className="flex gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-navy-900">
                上載檔案
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addFile(slot.id, f);
                    e.target.value = "";
                  }}
                />
              </label>
              {files.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => clearSlot(slot.id)}
                >
                  清除
                </Button>
              )}
            </div>
          </Card>
        );
      })}

      <Disclaimer>
        不接受只顯示地址而沒有業權人的非正式文件。物業開支欠款提示僅供顧問跟進，不可直接判定法律或信用問題。
      </Disclaimer>

      <div className="space-y-2">
        <Button fullWidth type="button" onClick={onDone}>
          完成此抵押品文件
        </Button>
        <Button fullWidth variant="outline" type="button" onClick={onBack}>
          返回編輯資料
        </Button>
      </div>
    </div>
  );
}

export function CollateralAnalysisCard({
  item,
  newLoanAmount = 0,
}: {
  item: CollateralItem;
  newLoanAmount?: number;
}) {
  const a = analyzeCollateral(item);
  const ltv = preliminaryLtv(item, newLoanAmount);

  return (
    <div className="space-y-3">
      <SectionHeader title="抵押品初步分析" subtitle={a.title} />
      <StateBanner
        tone={
          a.light === "green"
            ? "info"
            : a.light === "amber"
              ? "warning"
              : "error"
        }
        title={`${lightLabel(a.light)} · AI 信心度 ${a.confidence}`}
        description="紅燈只代表需要進一步審批，不應由 AI 直接作出最終拒絕決定。"
      />
      <Card className="space-y-1 text-sm">
        <Row label="抵押品類型" value={a.subtype} />
        <Row label="業權人／持有人" value={a.ownerOrHolder} />
        <Row label="申報價值" value={formatHKD(a.declaredValue)} />
        <Row label="文件列示價值" value={a.documentValueNote} />
        <Row label="現有貸款或融資" value={formatHKD(a.existingCharge)} />
        <Row label="初步淨值" value={formatHKD(a.netValue)} />
        {ltv != null && (
          <Row
            label="初步總 LTV"
            value={`${(ltv * 100).toFixed(1)}%（含新申請 ${formatHKD(newLoanAmount)}）`}
          />
        )}
        <Row
          label="文件完整度"
          value={`${a.completeness.done}／${a.completeness.total}`}
        />
        <Row label="業權核對" value={a.ownershipCheck} />
        <Row label="現有押記狀態" value={a.chargeStatus} />
        <Row
          label="正式估值"
          value={a.needsFormalValuation ? "尚未完成" : "已完成"}
        />
        {a.rentalMonthly != null && (
          <Row label="每月租金（申報）" value={formatHKD(a.rentalMonthly)} />
        )}
      </Card>
      <Card>
        <p className="text-xs font-semibold text-navy-900">風險提示</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-text-secondary">
          {a.risks.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>
      <Disclaimer>{COLLATERAL_VALUATION_DISCLAIMER}</Disclaimer>
    </div>
  );
}

function CollateralPortfolioSummary({
  items,
  newLoanAmount,
}: {
  items: CollateralItem[];
  newLoanAmount: number;
}) {
  const analyses = items.map(analyzeCollateral);
  const totalNet = analyses.reduce((s, a) => s + a.netValue, 0);
  return (
    <Card className="space-y-2">
      <p className="text-sm font-semibold text-navy-900">合併抵押品摘要</p>
      <p className="text-xs text-text-secondary">
        共 {items.length} 項 · 初步合計淨值 {formatHKD(totalNet)}
        {newLoanAmount > 0
          ? ` · 申請額 ${formatHKD(newLoanAmount)}`
          : ""}
      </p>
      <ul className="space-y-1 text-xs text-text-secondary">
        {analyses.map((a) => (
          <li key={a.itemId} className="flex justify-between gap-2">
            <span>
              {a.title}（{lightLabel(a.light)}）
            </span>
            <span className="tabular">
              {a.completeness.done}／{a.completeness.total}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** 文件步驟：共同文件區下方的抵押品文件區塊 */
export function CollateralDocsSection({
  items,
  onChange,
  newLoanAmount = 0,
}: {
  items: CollateralItem[];
  onChange: (next: CollateralItem[]) => void;
  newLoanAmount?: number;
}) {
  return (
    <div className="mt-6 space-y-3">
      <SectionHeader
        title="區塊二：抵押品文件"
        subtitle="按抵押品獨立顯示完成度"
      />
      <CollateralManager
        items={items}
        onChange={onChange}
        newLoanAmount={newLoanAmount}
        showDocs
        showAnalysis
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium text-navy-900 sm:text-right">{value}</dd>
    </div>
  );
}

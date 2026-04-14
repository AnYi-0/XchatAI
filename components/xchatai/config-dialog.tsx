'use client';

import type { AIProvider } from '@/lib/types/xchatai';
import { AI_PROVIDER_PRESETS, useConfigStore } from '@/lib/store/config-store';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password' | 'number';
  placeholder?: string;
}) {
  const { label, value, onChange, type = 'text', placeholder } = props;
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-2xl border border-border/70 bg-background/80 px-3.5 text-sm outline-none transition placeholder:text-[11px] placeholder:text-muted-foreground/45 focus:border-primary/60"
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const { label, value, options, onChange } = props;
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground/70">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-2xl border border-border/70 bg-background/80 px-3.5 text-sm outline-none transition focus:border-primary/60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusCard(props: {
  title: string;
  description: string;
  ready: boolean;
  readyText: string;
  emptyText: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const { title, description, ready, readyText, emptyText, actionLabel, onAction } = props;
  return (
    <div className="rounded-[22px] border border-border/70 bg-background/75 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium',
            ready
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
          )}
        >
          {ready ? readyText : emptyText}
        </span>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex h-9 items-center justify-center rounded-2xl border border-border/70 bg-background/90 px-4 text-sm font-medium text-foreground transition hover:bg-muted/80"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export function ConfigDialog(props: {
  open: boolean;
  dismissible: boolean;
  status: string | null;
  onClose: () => void;
  onTestTwitter: () => void;
  onTestAi: () => void;
  onSave: () => void;
}) {
  const { open, dismissible, status, onClose, onTestTwitter, onTestAi, onSave } = props;
  const twitterConfig = useConfigStore((state) => state.twitterConfig);
  const aiConfig = useConfigStore((state) => state.aiConfig);
  const setTwitterConfig = useConfigStore((state) => state.setTwitterConfig);
  const setAiConfig = useConfigStore((state) => state.setAiConfig);
  const secretStatus = useConfigStore((state) => state.secretStatus);
  const aiProviders: Array<{ value: AIProvider; label: string }> = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'claude', label: 'Claude' },
    { value: 'gemini', label: 'Gemini' },
    { value: 'qwen', label: 'Qwen' },
  ];

  const twitterConfigured = Boolean(
    twitterConfig.bearerToken.trim() || secretStatus.twitterBearerTokenSet,
  );
  const aiConfigured = Boolean(
    aiConfig.baseUrl.trim() && aiConfig.model.trim() && (aiConfig.apiKey.trim() || secretStatus.aiApiKeySet),
  );

  if (!open) return null;

  const applyAiProvider = (provider: AIProvider) => {
    const preset = AI_PROVIDER_PRESETS[provider];
    setAiConfig({
      provider,
      baseUrl: preset.baseUrl,
      model: preset.model,
      enableThinking: preset.enableThinking,
      thinkingBudget: preset.thinkingBudget,
      thinkingLevel: preset.thinkingLevel,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
      onClick={() => {
        if (dismissible) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[min(94vw,1120px)] rounded-[30px] border border-white/15 bg-white/95 p-5 shadow-2xl shadow-black/15 dark:bg-slate-900/95 dark:shadow-black/40 md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 rounded-[24px] border border-border/70 bg-gradient-to-r from-violet-500/10 via-sky-500/5 to-transparent p-4">
          <div className="flex items-start gap-4">
            <img src="/logo.png" alt="XchatAI" className="size-12 rounded-2xl object-cover shadow-sm" />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary/80">XchatAI</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">系统配置</h2>
            </div>
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-sm text-muted-foreground transition hover:text-foreground"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <StatusCard
              title="Twitter 配置"
              description="使用 Bearer Token 访问 X API。"
              ready={twitterConfigured}
              readyText="已配置"
              emptyText="未配置"
              actionLabel="测试连接"
              onAction={onTestTwitter}
            />
            <StatusCard
              title="AI 配置"
              description="选择提供商并测试 AI 生成能力。"
              ready={aiConfigured}
              readyText="已配置"
              emptyText="未配置"
              actionLabel="测试连接"
              onAction={onTestAi}
            />
            <div className="rounded-[22px] border border-border/70 bg-background/75 p-4 text-xs leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">提示</p>
              <p className="mt-2">
                Bearer Token 可在{' '}
                <a
                  href="https://console.x.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  console.x.com
                </a>{' '}
                登录后创建应用获取。
              </p>
            </div>
          </aside>

          <div className="space-y-4">
            <section className="rounded-[24px] border border-border/70 bg-background/72 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Twitter 配置</h3>
                  <p className="mt-1 text-sm text-muted-foreground">支持 Bearer Token，或通过 API Key + API Secret 自动换取 Token。</p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                    twitterConfigured
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
                  )}
                >
                  {twitterConfigured ? 'Twitter 已配置' : 'Twitter 未配置'}
                </span>
              </div>

              <div className="mt-5 grid gap-4">
                <Field
                  label="Bearer Token"
                  value={twitterConfig.bearerToken}
                  onChange={(value) => setTwitterConfig({ bearerToken: value })}
                  type="password"
                  placeholder={secretStatus.twitterBearerTokenSet ? '已保存，留空表示不修改' : ''}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="XCHATAI_TWITTER_API_KEY"
                    value={twitterConfig.apiKey}
                    onChange={(value) => setTwitterConfig({ apiKey: value })}
                    type="password"
                    placeholder={secretStatus.twitterApiKeySet ? '已保存，留空表示不修改' : ''}
                  />
                  <Field
                    label="XCHATAI_TWITTER_API_SECRET"
                    value={twitterConfig.apiSecret}
                    onChange={(value) => setTwitterConfig({ apiSecret: value })}
                    type="password"
                    placeholder={secretStatus.twitterApiSecretSet ? '已保存，留空表示不修改' : ''}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-border/70 bg-background/72 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">AI 配置</h3>
                  <p className="mt-1 text-sm text-muted-foreground">选择 Provider、模型与推理参数。</p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                    aiConfigured
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : 'border-primary/20 bg-primary/10 text-primary',
                  )}
                >
                  {aiConfigured ? `AI 已配置 · ${aiConfig.model}` : 'AI 未配置'}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Provider"
                  value={aiConfig.provider}
                  options={aiProviders}
                  onChange={(value) => applyAiProvider(value as AIProvider)}
                />
                <Field label="模型" value={aiConfig.model} onChange={(value) => setAiConfig({ model: value })} />
                <div className="md:col-span-2">
                  <Field label="Base URL" value={aiConfig.baseUrl} onChange={(value) => setAiConfig({ baseUrl: value })} />
                </div>
                <Field
                  label="API Key"
                  value={aiConfig.apiKey}
                  onChange={(value) => setAiConfig({ apiKey: value })}
                  type="password"
                  placeholder={secretStatus.aiApiKeySet ? '已保存，留空表示不修改' : ''}
                />
                <Field label="Temperature" value={aiConfig.temperature} onChange={(value) => setAiConfig({ temperature: value })} />
                <Field label="Max Tokens" value={aiConfig.maxTokens} onChange={(value) => setAiConfig({ maxTokens: value })} type="number" />
                <Field
                  label="Thinking Budget"
                  value={aiConfig.thinkingBudget}
                  onChange={(value) => setAiConfig({ thinkingBudget: value })}
                  type="number"
                />

                <div className="md:col-span-2 rounded-[20px] border border-border/70 bg-background/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={aiConfig.enableThinking}
                        onChange={(event) => setAiConfig({ enableThinking: event.target.checked })}
                      />
                      <span className="text-sm font-medium text-foreground">启用推理 / Thinking</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['minimal', 'low', 'medium', 'high'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setAiConfig({ thinkingLevel: level })}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                            aiConfig.thinkingLevel === level
                              ? 'border-primary/20 bg-primary/10 text-primary'
                              : 'border-border/70 bg-background/80 text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {status ? (
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground dark:text-primary-foreground">
            {status}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onSave}
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            保存全部配置
          </button>
        </div>
      </div>
    </div>
  );
}

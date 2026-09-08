import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  Target,
  MessageSquare,
  BookOpen,
  User,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { PromptAnalysisResult } from '../../types';

interface SmartPromptAnalyzerProps {
  currentPrompt: string;
  onApplyStructuredPrompt: (structuredPrompt: string) => void;
  onUpdatePersonality?: (personality: string) => void;
}

export const SmartPromptAnalyzer: React.FC<SmartPromptAnalyzerProps> = ({
  currentPrompt,
  onApplyStructuredPrompt,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<PromptAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'preview'>('overview');

  const handleAnalyzePrompt = async () => {
    if (!currentPrompt.trim()) {
      setError('Please type or paste a prompt in the textarea first to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setApplied(false);

    try {
      const res = await fetch('/api/gemini/analyze-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      if (!res.ok) {
        throw new Error(`Failed to analyze prompt (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (data.analysis) {
        setAnalysisResult(data.analysis);
        setIsExpanded(true);
      } else {
        throw new Error('Analysis response was empty');
      }
    } catch (err: any) {
      console.error('[PROMPT_ANALYZER_CLIENT_ERROR]', err);
      setError(err?.message || 'Could not analyze prompt. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyPrompt = () => {
    if (!analysisResult?.enhanced_structured_prompt) return;
    onApplyStructuredPrompt(analysisResult.enhanced_structured_prompt);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const handleCopyPrompt = () => {
    if (!analysisResult?.enhanced_structured_prompt) return;
    navigator.clipboard.writeText(analysisResult.enhanced_structured_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-3">
      {/* Top Action Bar with Prominent Button */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleAnalyzePrompt}
          disabled={isAnalyzing || !currentPrompt.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group active:scale-98"
          title="Analyze and split raw prompt into structured categories"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Analyzing Prompt with Gemini...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300/40 group-hover:rotate-12 transition-transform" />
              <span>Analyze & Structure Prompt</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-100">
            <Zap className="w-3 h-3 text-indigo-600" />
            Gemini 3.8 Flash
          </span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="hidden sm:inline text-slate-500">Smart Prompt Decomposer</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Structured Analysis Results Container */}
      {analysisResult && (
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-xl border border-indigo-200/80 shadow-sm overflow-hidden transition-all duration-300">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 tracking-tight">
                    Smart Prompt Analyzer Breakdown
                  </h4>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                    Quality: {analysisResult.quality_score}/100
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {analysisResult.analysis_summary}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleApplyPrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Replace textarea with this formatted prompt"
              >
                {applied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied!</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Apply Structured Prompt</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Collapsible Content */}
          {isExpanded && (
            <div className="p-4 space-y-4">
              {/* Category Navigation Pills */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Categories
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('categories')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'categories'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Deep Breakdown
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Markdown Output
                </button>
              </div>

              {/* TAB 1: OVERVIEW GRID */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Category 1: Role & Persona */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-indigo-700">
                      <User className="w-4 h-4 text-indigo-600" />
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        1. Role & Identity
                      </h5>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {analysisResult.role_identity.role}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">Persona:</span>{' '}
                      {analysisResult.role_identity.persona}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Audience:</span>{' '}
                      {analysisResult.role_identity.target_audience}
                    </p>
                  </div>

                  {/* Category 2: Behavior & Conversational Tone */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-blue-700">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        2. Behavior & Tone
                      </h5>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {analysisResult.behavior_tone.tone}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {analysisResult.behavior_tone.style_guidelines.map((style, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-100"
                        >
                          {style}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 pt-0.5">
                      Emoji rule: {analysisResult.behavior_tone.emoji_usage} •{' '}
                      {analysisResult.behavior_tone.reply_length_guideline}
                    </p>
                  </div>

                  {/* Category 3: Primary Objectives & Actions */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Target className="w-4 h-4 text-emerald-600" />
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        3. Primary Objectives
                      </h5>
                    </div>
                    <ul className="space-y-1">
                      {analysisResult.primary_objectives.map((obj, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Category 4: Guardrails & Safety Rules */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2 text-rose-700">
                      <ShieldCheck className="w-4 h-4 text-rose-600" />
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        4. Safety Guardrails
                      </h5>
                    </div>
                    <ul className="space-y-1">
                      {analysisResult.guardrails_constraints.map((guard, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                          <span>{guard}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: DEEP BREAKDOWN & RECOMMENDATIONS */}
              {activeTab === 'categories' && (
                <div className="space-y-3">
                  {/* Knowledge & Context */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-purple-700">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        5. Business Knowledge & Context Extracted
                      </h5>
                    </div>
                    {analysisResult.knowledge_context.business_name_or_type && (
                      <p className="text-xs text-slate-700">
                        <span className="font-bold">Business Profile:</span>{' '}
                        {analysisResult.knowledge_context.business_name_or_type}
                      </p>
                    )}
                    {analysisResult.knowledge_context.products_or_services?.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-600">Identified Offerings:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysisResult.knowledge_context.products_or_services.map((p, i) => (
                            <span key={i} className="text-[10px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-100 font-medium">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Recommendations Box */}
                  {analysisResult.suggestions?.length > 0 && (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900">
                        <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                        <h5 className="text-xs font-bold uppercase tracking-wider">
                          AI Recommendations for Better Conversion
                        </h5>
                      </div>
                      <ul className="space-y-1 pl-1">
                        {analysisResult.suggestions.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-amber-950 font-medium">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: STRUCTURED MARKDOWN OUTPUT PREVIEW */}
              {activeTab === 'preview' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-bold">Synthesized Markdown Prompt:</span>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {analysisResult.enhanced_structured_prompt}
                  </pre>
                </div>
              )}

              {/* Bottom Quick Apply Bar */}
              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">
                  Ready to deploy? Apply this structured prompt to your system prompt textarea with 1 click.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPrompt}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {applied ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    <span>{applied ? 'Applied to Prompt!' : 'Apply to System Prompt'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

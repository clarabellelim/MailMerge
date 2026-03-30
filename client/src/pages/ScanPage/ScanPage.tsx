import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  startScan,
  startKeywordScan,
  getScanStatus,
  downloadScanResult,
  saveExcelFile,
} from '@/api/scan';
import { Download, Loader2, ScanLine, Search } from 'lucide-react';
import { toast } from 'sonner';

const MAX_URLS_PER_TASK = 500;
const MAX_KEYWORD_RESULTS = 500;

function parseUrls(text: string): string[] {
  // Accept newline-separated or comma-separated URLs.
  const raw = text
    .split(/\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
  // Deduplicate while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of raw) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export default function ScanPage() {
  const [mode, setMode] = useState<'keyword' | 'urls'>('keyword');

  // Keyword mode
  const [keyword, setKeyword] = useState('');
  const [platform, setPlatform] = useState<'tiktok' | 'instagram' | 'youtube'>('tiktok');
  const [maxResults, setMaxResults] = useState('30');

  // URL mode
  const [urlsText, setUrlsText] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    completed: number;
    total: number;
    currentVideo?: string;
    retryCount: number;
    failedSubPages: number;
    status: 'running' | 'completed' | 'failed';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleStartScan = async () => {
    if (mode === 'keyword') {
      const kw = keyword.trim();
      if (!kw) {
        toast.error('请输入关键词');
        return;
      }
      const n = Number(maxResults);
      if (!Number.isFinite(n) || n < 1 || n > MAX_KEYWORD_RESULTS) {
        toast.error(`数量必须是 1-${MAX_KEYWORD_RESULTS}`);
        return;
      }

      setIsLoading(true);
      try {
        const response = await startKeywordScan({
          keyword: kw,
          platform,
          maxResults: n,
        });
        setTaskId(response.taskId);
        toast.success('关键词扫描任务已启动');
      } catch {
        toast.error('启动关键词扫描任务失败');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const urls = parseUrls(urlsText);
    if (urls.length === 0) {
      toast.error('请输入至少一个有效URL');
      return;
    }
    if (urls.length > MAX_URLS_PER_TASK) {
      toast.error(`单次任务最多支持${MAX_URLS_PER_TASK}个URL`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await startScan({ urls });
      setTaskId(response.taskId);
      toast.success('扫描任务已启动');
    } catch (error) {
      toast.error('启动扫描任务失败');
    } finally {
      setIsLoading(false);
    }
  };

  const pollStatus = useCallback(async () => {
    if (!taskId) return;
    try {
      const currentStatus = await getScanStatus(taskId);
      setStatus(currentStatus);

      if (currentStatus.status === 'running') {
        setTimeout(pollStatus, 2000);
      } else if (currentStatus.status === 'completed') {
        toast.success('扫描任务完成');
      } else if (currentStatus.status === 'failed') {
        toast.error('扫描任务失败');
      }
    } catch {
      toast.error('获取扫描状态失败');
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) pollStatus();
  }, [taskId, pollStatus]);

  const progress = status && status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0;

  const handleDownload = async () => {
    if (!taskId) return;
    setIsDownloading(true);
    try {
      const blob = await downloadScanResult(taskId);
      saveExcelFile(blob, `scan_result_${taskId}.xlsx`);
      toast.success('Excel导出成功');
    } catch {
      toast.error('导出Excel失败');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mode switch */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={mode === 'keyword' ? 'default' : 'outline'}
          onClick={() => setMode('keyword')}
          disabled={status?.status === 'running'}
        >
          关键词扫描
        </Button>
        <Button
          size="sm"
          variant={mode === 'urls' ? 'default' : 'outline'}
          onClick={() => setMode('urls')}
          disabled={status?.status === 'running'}
        >
          URL 扫描
        </Button>
      </div>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="size-5" />
            {mode === 'keyword' ? '关键词扫描（趋势内容创作者）' : '批量扫描网红页面'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'keyword' ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>关键词</Label>
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="例如：matcha"
                  disabled={status?.status === 'running'}
                />
                <p className="text-sm text-muted-foreground">
                  将自动搜索该关键词下的热门内容并提取唯一创作者
                </p>
              </div>
              <div className="space-y-2">
                <Label>平台</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  disabled={status?.status === 'running'}
                >
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>数量（唯一创作者）</Label>
                <Input
                  value={maxResults}
                  onChange={(e) => setMaxResults(e.target.value)}
                  placeholder="30"
                  disabled={status?.status === 'running'}
                />
                <p className="text-sm text-muted-foreground">1 - {MAX_KEYWORD_RESULTS}</p>
              </div>
              <div className="md:col-span-3 text-sm text-muted-foreground">
                无需登录，但可能会遇到平台反爬限制，失败/部分完成会体现在任务状态中。
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Profile URLs</Label>
              <Textarea
                placeholder="每行一个URL（支持 YouTube / Instagram / TikTok profile 链接）"
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                className="min-h-[160px] font-mono text-sm"
                disabled={status?.status === 'running'}
              />
              <p className="text-sm text-muted-foreground">
                支持换行或逗号分隔；单次最多 {MAX_URLS_PER_TASK} 个。
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              系统会自动检测平台并尝试在页面/子页中提取邮箱
            </span>
            <Button onClick={handleStartScan} disabled={isLoading || status?.status === 'running'}>
              {isLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ScanLine className="mr-2 size-4" />
              )}
              开始扫描
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 扫描状态区 */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">扫描进度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {status.completed} / {status.total}
                </span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {status.currentVideo && (
              <div className="text-sm text-muted-foreground truncate">
                正在处理: {status.currentVideo}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge variant={status.status === 'running' ? 'default' : 'secondary'}>
                {status.status === 'running' ? '扫描中' : status.status === 'completed' ? '已完成' : '失败'}
              </Badge>
              {status.retryCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-yellow-500 text-yellow-700"
                >
                  重试 {status.retryCount}
                </Badge>
              )}
              {status.failedSubPages > 0 && (
                <Badge variant="destructive">
                  子页失败 {status.failedSubPages}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 结果导出区 */}
      {status?.status === 'completed' && taskId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">扫描结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                扫描已完成，共处理 {status.completed} 个URL，数据已自动保存到数据库
              </span>
              <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                导出Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

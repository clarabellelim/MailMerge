import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getInfluencers } from '@/api/influencer';
import { getTemplates } from '@/api/email-template';
import { startSend, getSendStatus } from '@/api/email-send';
import type { Influencer, EmailTemplate } from '@shared/api.interface';
import { Send, Users, Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const BATCH_SIZE = 30;
const DELAY_SECONDS = 15;

export default function SendPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedInfluencers, setSelectedInfluencers] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    success: number;
    failed: number;
    skipped: number;
    total: number;
    status: 'running' | 'completed';
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchInfluencers = async () => {
    try {
      const response = await getInfluencers(page, 20, true);
      setInfluencers(response.items);
      setTotal(response.total);
    } catch (error) {
      toast.error('获取网红列表失败');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await getTemplates();
      setTemplates(response);
      // 设置默认模板
      const defaultTemplate = response.find((t) => t.isDefault);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
      } else if (response.length > 0) {
        setSelectedTemplate(response[0].id);
      }
    } catch (error) {
      toast.error('获取模板列表失败');
    }
  };

  useEffect(() => {
    fetchInfluencers();
    fetchTemplates();
  }, [page]);

  const pollStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      const currentStatus = await getSendStatus(taskId);
      setStatus(currentStatus);

      if (currentStatus.status === 'running') {
        setTimeout(pollStatus, 2000);
      } else if (currentStatus.status === 'completed') {
        toast.success('邮件发送完成');
      }
    } catch (error) {
      toast.error('获取发送状态失败');
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId && status?.status === 'running') {
      pollStatus();
    }
  }, [taskId, status?.status, pollStatus]);

  useEffect(() => {
    if (taskId) {
      pollStatus();
    }
  }, [taskId, pollStatus]);

  const toggleSelectAll = () => {
    if (selectedInfluencers.size === influencers.length) {
      setSelectedInfluencers(new Set());
    } else {
      setSelectedInfluencers(new Set(influencers.map((i) => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedInfluencers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedInfluencers(newSet);
  };

  const handleStartSend = async () => {
    if (selectedInfluencers.size === 0) {
      toast.error('请至少选择一个收件人');
      return;
    }

    if (!selectedTemplate) {
      toast.error('请选择一个邮件模板');
      return;
    }

    setLoading(true);
    try {
      const response = await startSend({
        influencerIds: Array.from(selectedInfluencers),
        templateId: selectedTemplate,
      });
      setTaskId(response.taskId);
      toast.success('邮件发送任务已启动');
    } catch (error) {
      toast.error('启动邮件发送失败');
    } finally {
      setLoading(false);
    }
  };

  const progress = status
    ? Math.round(
        ((status.success + status.failed + status.skipped) / status.total) * 100,
      )
    : 0;

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      {/* 发送配置区 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="size-5" />
            发送配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>选择邮件模板</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="选择模板" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.isDefault && ' (默认)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplateData && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">主题:</span>{' '}
                {selectedTemplateData.subject}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 p-4 bg-accent/50 rounded-lg">
            <AlertCircle className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              每批最多{BATCH_SIZE}封邮件，每封间隔{DELAY_SECONDS}秒，以遵守平台限制
            </p>
          </div>

          <Button
            onClick={handleStartSend}
            disabled={
              loading ||
              status?.status === 'running' ||
              selectedInfluencers.size === 0
            }
            className="w-full md:w-auto"
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Send className="mr-2 size-4" />
            )}
            发送邮件 ({selectedInfluencers.size} 位收件人)
          </Button>
        </CardContent>
      </Card>

      {/* 收件人选择区 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="size-5" />
              选择收件人
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                已选择 {selectedInfluencers.size} 人
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedInfluencers.size === influencers.length &&
                        influencers.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Followers</TableHead>
                  <TableHead>收件邮箱</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {influencers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      暂无已验证的网红数据
                    </TableCell>
                  </TableRow>
                ) : (
                  influencers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInfluencers.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.handle}</TableCell>
                      <TableCell>{item.platform}</TableCell>
                      <TableCell className="tabular-nums">
                        {item.followers.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {item.manualEmail || item.emailFound || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              共 {total} 条记录
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <span className="text-sm">第 {page} 页</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 进度展示区 */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">发送进度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {status.success + status.failed + status.skipped} / {status.total}
                </span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold">{status.success}</p>
                <p className="text-sm text-muted-foreground">成功</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold text-destructive">{status.failed}</p>
                <p className="text-sm text-muted-foreground">失败</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold text-warning">{status.skipped}</p>
                <p className="text-sm text-muted-foreground">跳过</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold">{status.total}</p>
                <p className="text-sm text-muted-foreground">总计</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {status.status === 'running' ? (
                <Badge className="gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  发送中
                </Badge>
              ) : (
                <Badge className="gap-1 bg-success text-success-foreground">
                  <CheckCircle className="size-3" />
                  已完成
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

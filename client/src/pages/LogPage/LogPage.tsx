import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSendLogs, resendLog, exportLogs } from '@/api/send-log';
import type { SendLog } from '@shared/api.interface';
import {
  FileText,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'pending', label: '待发送' },
  { value: 'skipped', label: '跳过' },
];

export default function LogPage() {
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await getSendLogs(
        page,
        20,
        statusFilter === 'all' ? undefined : statusFilter,
        startTime || undefined,
        endTime || undefined,
      );
      setLogs(response.items);
      setTotal(response.total);
    } catch (error) {
      toast.error('获取发送日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleResend = async (id: string) => {
    try {
      await resendLog(id);
      toast.success('重发成功');
      fetchLogs();
    } catch (error) {
      toast.error('重发失败');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportLogs();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `send-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('导出成功');
    } catch (error) {
      toast.error('导出失败');
    }
  };

  const formatTime = (time: string): string => {
    if (!time) return '-';
    return new Date(time).toLocaleString('zh-CN');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="gap-1 bg-success text-success-foreground">
            <CheckCircle className="size-3" />
            成功
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="gap-1 bg-destructive text-destructive-foreground">
            <XCircle className="size-3" />
            失败
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="size-3" />
            待发送
          </Badge>
        );
      case 'skipped':
        return (
          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700 bg-yellow-50">
            <AlertCircle className="size-3" />
            跳过
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 筛选区 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="size-5" />
            发送日志
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>开始时间</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-2">
              <Label>结束时间</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button onClick={handleSearch}>查询</Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 size-4" />
              导出
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>网红Handle</TableHead>
                  <TableHead>收件邮箱</TableHead>
                  <TableHead>发送状态</TableHead>
                  <TableHead>错误原因</TableHead>
                  <TableHead>发送时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.influencerHandle}
                      </TableCell>
                      <TableCell>{log.recipientEmail}</TableCell>
                      <TableCell>{getStatusBadge(log.sendStatus)}</TableCell>
                      <TableCell>
                        {log.errorReason ? (
                          <div className="flex items-center gap-1 text-destructive text-sm">
                            <AlertCircle className="size-4" />
                            {log.errorReason}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{formatTime(log.sendTime)}</TableCell>
                      <TableCell>
                        {log.sendStatus === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(log.id)}
                          >
                            <RefreshCw className="mr-1 size-4" />
                            重发
                          </Button>
                        )}
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
    </div>
  );
}

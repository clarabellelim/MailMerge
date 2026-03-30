import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getInfluencers, updateInfluencer, uploadInfluencerFile } from '@/api/influencer';
import type { Influencer } from '@shared/api.interface';
import {
  FileCheck,
  Upload,
  Edit,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getScanStatusBadge(scanStatus: Influencer['scanStatus']): {
  label: string;
  className: string;
} {
  switch (scanStatus) {
    case 'complete':
      return { label: '扫描完成', className: 'border-green-500 text-green-700 bg-green-50' };
    case 'partial':
      return { label: '部分完成', className: 'border-yellow-500 text-yellow-700 bg-yellow-50' };
    case 'failed':
      return { label: '扫描失败', className: 'border-red-500 text-red-700 bg-red-50' };
    default:
      return { label: scanStatus, className: 'border-gray-500 text-gray-700 bg-gray-50' };
  }
}

export default function ReviewPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterVerified, setFilterVerified] = useState<boolean | undefined>(
    undefined,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Excel-like filters/sort (client-side on current page for MVP)
  const [qHandle, setQHandle] = useState('');
  const [qPlatform, setQPlatform] = useState<'all' | 'tiktok' | 'instagram' | 'youtube'>('all');
  const [minFollowers, setMinFollowers] = useState('');
  const [maxFollowers, setMaxFollowers] = useState('');
  const [sortKey, setSortKey] = useState<'handle' | 'platform' | 'followers'>('followers');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(
    null,
  );
  const [manualEmail, setManualEmail] = useState('');
  const [verified, setVerified] = useState(false);

  const fetchInfluencers = async () => {
    setLoading(true);
    try {
      const response = await getInfluencers(page, 20, filterVerified);
      setInfluencers(response.items);
      setTotal(response.total);
    } catch (error) {
      toast.error('获取网红列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfluencers();
  }, [page, filterVerified]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, filterVerified]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadInfluencerFile(file);
      toast.success(`上传成功: ${result.successCount}条, 失败: ${result.failedCount}条`);
      fetchInfluencers();
    } catch {
      toast.error('上传失败（请确认文件为 .csv 或 .xlsx）');
    } finally {
      // allow selecting same file again
      event.target.value = '';
    }
  };

  const handleEdit = (influencer: Influencer) => {
    setEditingInfluencer(influencer);
    setManualEmail(influencer.manualEmail || '');
    setVerified(influencer.verified);
  };

  const handleSave = async () => {
    if (!editingInfluencer) return;

    if (manualEmail && !EMAIL_REGEX.test(manualEmail)) {
      toast.error('邮箱格式不正确');
      return;
    }

    try {
      await updateInfluencer(editingInfluencer.id, {
        manualEmail: manualEmail || undefined,
        verified,
      });
      toast.success('更新成功');
      setEditingInfluencer(null);
      fetchInfluencers();
    } catch (error) {
      toast.error('更新失败');
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  const visibleInfluencers = useMemo(() => {
    const handleQuery = qHandle.trim().toLowerCase();
    const minF = minFollowers.trim() ? Number(minFollowers) : null;
    const maxF = maxFollowers.trim() ? Number(maxFollowers) : null;

    let list = influencers.slice();
    if (handleQuery) list = list.filter((x) => (x.handle || '').toLowerCase().includes(handleQuery));
    if (qPlatform !== 'all') list = list.filter((x) => x.platform === qPlatform);
    if (minF !== null && Number.isFinite(minF)) list = list.filter((x) => (x.followers || 0) >= minF);
    if (maxF !== null && Number.isFinite(maxF)) list = list.filter((x) => (x.followers || 0) <= maxF);

    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === 'followers') return ((a.followers || 0) - (b.followers || 0)) * dir;
      if (sortKey === 'platform') return String(a.platform || '').localeCompare(String(b.platform || '')) * dir;
      return String(a.handle || '').localeCompare(String(b.handle || '')) * dir;
    });
    return list;
  }, [influencers, qHandle, qPlatform, minFollowers, maxFollowers, sortKey, sortDir]);

  const toggleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    const allSelected = visibleInfluencers.length > 0 && visibleInfluencers.every((x) => next.has(x.id));
    if (allSelected) for (const x of visibleInfluencers) next.delete(x.id);
    else for (const x of visibleInfluencers) next.add(x.id);
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkVerify = async (nextVerified: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error('请先勾选需要批量操作的记录');
      return;
    }
    try {
      for (const id of ids) {
        await updateInfluencer(id, { verified: nextVerified });
      }
      toast.success(`批量${nextVerified ? '验证' : '取消验证'}成功：${ids.length}条`);
      setSelectedIds(new Set());
      fetchInfluencers();
    } catch {
      toast.error('批量操作失败（请重试）');
    }
  };

  const onClickSort = (key: 'handle' | 'platform' | 'followers') => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir(key === 'handle' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* 文件上传区 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="size-5" />
            上传文件（CSV / Excel）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              className="max-w-sm"
            />
            <span className="text-sm text-muted-foreground">
              支持扫描生成的 CSV / Excel 文件格式
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 筛选和列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck className="size-5" />
              网红数据列表
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={filterVerified === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterVerified(undefined)}
              >
                全部
              </Button>
              <Button
                variant={filterVerified === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterVerified(true)}
              >
                已验证
              </Button>
              <Button
                variant={filterVerified === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterVerified(false)}
              >
                未验证
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Excel-like filters + bulk actions */}
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>Handle 搜索</Label>
                <Input
                  value={qHandle}
                  onChange={(e) => setQHandle(e.target.value)}
                  placeholder="例如：hungry / matcha"
                  className="w-[220px]"
                />
              </div>
              <div className="space-y-1">
                <Label>平台</Label>
                <select
                  className="w-[160px] border rounded-md px-3 py-2 text-sm bg-background"
                  value={qPlatform}
                  onChange={(e) => setQPlatform(e.target.value as any)}
                >
                  <option value="all">全部</option>
                  <option value="tiktok">tiktok</option>
                  <option value="instagram">instagram</option>
                  <option value="youtube">youtube</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>粉丝数 ≥</Label>
                <Input
                  value={minFollowers}
                  onChange={(e) => setMinFollowers(e.target.value)}
                  placeholder="例如：10000"
                  className="w-[140px] tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <Label>粉丝数 ≤</Label>
                <Input
                  value={maxFollowers}
                  onChange={(e) => setMaxFollowers(e.target.value)}
                  placeholder="例如：100000"
                  className="w-[140px] tabular-nums"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQHandle('');
                    setQPlatform('all');
                    setMinFollowers('');
                    setMaxFollowers('');
                  }}
                >
                  清空筛选
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                当前页筛选后：{visibleInfluencers.length} 条；已勾选：{selectedIds.size} 条
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => handleBulkVerify(true)} disabled={selectedIds.size === 0}>
                  批量验证
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkVerify(false)}
                  disabled={selectedIds.size === 0}
                >
                  取消验证
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        visibleInfluencers.length > 0 &&
                        visibleInfluencers.every((x) => selectedIds.has(x.id))
                      }
                      onCheckedChange={toggleSelectAllVisible}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => onClickSort('handle')}>
                    Handle {sortKey === 'handle' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => onClickSort('platform')}>
                    Platform {sortKey === 'platform' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => onClickSort('followers')}>
                    Followers {sortKey === 'followers' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead>Engagement Rate</TableHead>
                  <TableHead className="max-w-xs">Bio</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contact Link</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : visibleInfluencers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleInfluencers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelectOne(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.handle}</TableCell>
                      <TableCell>{item.platform}</TableCell>
                      <TableCell className="tabular-nums text-right">
                        {item.followers.toLocaleString()}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {item.engagementRate}%
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.bio}
                      </TableCell>
                      <TableCell>
                        {item.manualEmail || item.emailFound || '-'}
                      </TableCell>
                      <TableCell>
                        {item.contactLinkFallback ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openLink(item.contactLinkFallback)}
                          >
                            <ExternalLink className="size-4" />
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 items-center">
                          {item.verified ? (
                            <Badge className="gap-1 bg-success text-success-foreground">
                              <Check className="size-3" />
                              已验证
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <X className="size-3" />
                              未验证
                            </Badge>
                          )}

                          <Badge
                            variant="outline"
                            className={`gap-1 ${getScanStatusBadge(item.scanStatus).className}`}
                          >
                            {getScanStatusBadge(item.scanStatus).label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="size-4" />
                        </Button>
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

      {/* 编辑弹窗 */}
      <Dialog
        open={!!editingInfluencer}
        onOpenChange={() => setEditingInfluencer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑网红信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingInfluencer && (
              <div className="flex flex-wrap gap-2 items-center">
                <Badge
                  variant="outline"
                  className={`gap-1 ${getScanStatusBadge(editingInfluencer.scanStatus).className}`}
                >
                  {getScanStatusBadge(editingInfluencer.scanStatus).label}
                </Badge>

                {editingInfluencer.contactLinkFallback && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openLink(editingInfluencer.contactLinkFallback || '')}
                  >
                    <ExternalLink className="mr-2 size-4" />
                    打开 fallback 联系页
                  </Button>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Handle</Label>
              <Input value={editingInfluencer?.handle || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>手动补充邮箱</Label>
              <Input
                type="email"
                placeholder="输入邮箱地址"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
              />
              {manualEmail && !EMAIL_REGEX.test(manualEmail) && (
                <p className="text-sm text-destructive">邮箱格式不正确</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="verified"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              <Label htmlFor="verified">标记为已验证</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInfluencer(null)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

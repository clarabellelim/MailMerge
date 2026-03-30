import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TiptapEditorComplete } from '@/components/business-ui/tiptap-editor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { getTemplates, createTemplate, deleteTemplate } from '@/api/email-template';
import type { EmailTemplate } from '@shared/api.interface';
import { Mail, Plus, Trash2, Edit, Star } from 'lucide-react';
import { toast } from 'sonner';
import { showConfirm } from '@lark-apaas/client-toolkit';

const PREVIEW_NAME = 'Example Creator';

export default function TemplatePage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await getTemplates();
      setTemplates(response);
    } catch (error) {
      toast.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateSubject('');
    setTemplateContent('');
    setIsDefault(false);
    setIsEditing(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateSubject(template.subject);
    setTemplateContent(template.content);
    setIsDefault(template.isDefault);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('请输入模板名称');
      return;
    }
    if (!templateSubject.trim()) {
      toast.error('请输入邮件主题');
      return;
    }
    if (!templateContent.trim()) {
      toast.error('请输入邮件内容');
      return;
    }

    try {
      await createTemplate({
        id: editingTemplate?.id,
        name: templateName,
        subject: templateSubject,
        content: templateContent,
        isDefault,
      });
      toast.success(editingTemplate ? '模板更新成功' : '模板创建成功');
      setIsEditing(false);
      fetchTemplates();
    } catch (error) {
      toast.error(editingTemplate ? '更新模板失败' : '创建模板失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await showConfirm('确定要删除这个模板吗？')) return;

    try {
      await deleteTemplate(id);
      toast.success('模板删除成功');
      fetchTemplates();
    } catch (error) {
      toast.error('删除模板失败');
    }
  };

  // 替换变量用于预览
  const getPreviewContent = (content: string): string => {
    return content.replace(/\{\{name\}\}/g, PREVIEW_NAME);
  };

  return (
    <div className="space-y-6">
      {/* 模板列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="size-5" />
              邮件模板
            </CardTitle>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 size-4" />
              新建模板
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无模板，点击右上角新建模板
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.isDefault && (
                          <Badge variant="outline" className="text-primary border-primary">
                            <Star className="mr-1 size-3" />
                            默认
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground truncate">
                      主题: {template.subject}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑弹窗 */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? '编辑模板' : '新建模板'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4 space-y-4 pr-2">
            <div className="space-y-2">
              <Label>模板名称</Label>
              <Input
                placeholder="输入模板名称"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>邮件主题</Label>
              <Input
                placeholder="输入邮件主题，可使用 {{name}} 变量"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                使用 {'{{name}}'} 变量将自动替换为网红昵称
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              <Label htmlFor="isDefault">设为默认模板</Label>
            </div>

            <div className="space-y-2">
              <Label>邮件内容</Label>
              <TiptapEditorComplete
                value={templateContent}
                onValueChange={setTemplateContent}
                placeholder="输入邮件内容，可使用 {{name}} 变量"
              />

              <p className="text-xs text-muted-foreground">
                富文本预览会在前端把 {'{{name}}'} 替换为 {PREVIEW_NAME}。
              </p>

              <div className="space-y-2 pt-2">
                <Label>预览</Label>
                <div className="bg-card border rounded-sm p-3 overflow-hidden">
                  <div className="text-sm text-muted-foreground mb-2">
                    主题预览：{' '}
                    <span className="text-foreground font-medium">
                      {templateSubject.replace(/\{\{name\}\}/g, PREVIEW_NAME)}
                    </span>
                  </div>
                  <div
                    className="prose max-w-none"
                    // Template content is user-provided HTML; for MVP preview only.
                    dangerouslySetInnerHTML={{
                      __html: templateContent.replace(/\{\{name\}\}/g, PREVIEW_NAME),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

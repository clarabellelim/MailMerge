import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAuthStatus, getAuthUrl, getAuthConfigStatus } from '@/api/auth';
import { Key, ExternalLink, CheckCircle, XCircle, AlertCircle, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

export default function AuthPage() {
  const [authStatus, setAuthStatus] = useState<{
    isAuthorized: boolean;
    expiresAt: string;
  } | null>(null);
  const [configStatus, setConfigStatus] = useState<{
    isConfigured: boolean;
    missingConfigs: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const [authRes, configRes] = await Promise.all([
        getAuthStatus(),
        getAuthConfigStatus(),
      ]);
      setAuthStatus(authRes);
      setConfigStatus(configRes);
    } catch (error) {
      toast.error('获取状态失败');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    try {
      const response = await getAuthUrl();
      // 跳转到飞书授权页面（外部链接）
      // eslint-disable-next-line no-restricted-syntax
      window.location.href = response.url;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '获取授权链接失败');
      setLoading(false);
    }
  };

  const formatExpiresAt = (expiresAt: string): string => {
    if (!expiresAt) return '';
    const date = new Date(expiresAt);
    return date.toLocaleString('zh-CN');
  };

  const isTokenExpired = (expiresAt: string): boolean => {
    if (!expiresAt) return true;
    return new Date() > new Date(expiresAt);
  };

  // 配置未完成的提示
  const renderConfigWarning = () => {
    if (!configStatus || configStatus.isConfigured) return null;

    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-warning">
            <Settings className="size-5" />
            飞书OAuth配置未完成
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            需要在服务器环境变量中配置以下飞书开放平台参数：
          </p>
          <ul className="list-disc list-inside text-sm space-y-1">
            {configStatus.missingConfigs.map((config) => (
              <li key={config} className="text-destructive font-mono">
                {config}
              </li>
            ))}
          </ul>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>配置步骤：</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>前往 <UniversalLink to="https://open.feishu.cn/app" target="_blank" rel="noopener noreferrer" className="text-primary underline">飞书开放平台</UniversalLink> 创建应用</li>
              <li>获取应用的 App ID 和 App Secret</li>
              <li>配置 OAuth 2.0 回调地址</li>
              <li>将以上信息配置到服务器环境变量中</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (pageLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 配置警告 */}
      {renderConfigWarning()}

      {/* 授权状态区 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="size-5" />
            飞书授权状态
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {authStatus === null ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : authStatus.isAuthorized && !isTokenExpired(authStatus.expiresAt) ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg">
                <CheckCircle className="size-6 text-success" />
                <div>
                  <p className="font-medium text-success">已授权</p>
                  <p className="text-sm text-muted-foreground">
                    Token有效期至: {formatExpiresAt(authStatus.expiresAt)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
                <XCircle className="size-6 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">未授权</p>
                  <p className="text-sm text-muted-foreground">
                    需要授权飞书账号才能使用邮件发送功能
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 授权引导区 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">授权引导</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium">点击授权按钮</p>
                <p className="text-sm text-muted-foreground">
                  点击下方按钮跳转到飞书授权页面
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium">完成飞书登录</p>
                <p className="text-sm text-muted-foreground">
                  使用您的飞书账号登录并同意授权
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium">返回应用</p>
                <p className="text-sm text-muted-foreground">
                  授权完成后将自动返回应用
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-accent/50 rounded-lg">
            <AlertCircle className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              授权后系统会自动刷新token，无需重复授权。如遇到发送失败，请检查授权是否过期。
            </p>
          </div>

          <Button
            onClick={handleAuth}
            disabled={
              loading ||
              !configStatus?.isConfigured ||
              (authStatus?.isAuthorized && !isTokenExpired(authStatus.expiresAt))
            }
            className="w-full"
          >
            {loading ? (
              '跳转中...'
            ) : !configStatus?.isConfigured ? (
              '请先完成OAuth配置'
            ) : authStatus?.isAuthorized && !isTokenExpired(authStatus.expiresAt) ? (
              '已授权'
            ) : (
              <>
                <ExternalLink className="mr-2 size-4" />
                前往飞书授权
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 配置说明区 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            本应用使用飞书开放平台API发送邮件，需要您授权访问您的飞书邮箱。授权信息包括：
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>获取您的飞书身份信息</li>
            <li>发送邮件权限（仅通过本应用发送）</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            我们不会保存您的飞书密码，所有授权信息都经过加密存储。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

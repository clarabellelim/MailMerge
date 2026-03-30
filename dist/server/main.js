"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const fullstack_nestjs_core_1 = require("@lark-apaas/fullstack-nestjs-core");
const path_1 = require("path");
const hbs_1 = require("hbs");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        abortOnError: process.env.NODE_ENV !== 'development',
    });
    await (0, fullstack_nestjs_core_1.configureApp)(app, {
        disableSwagger: true,
        // OAuth callback is a browser redirect (cannot attach CSRF header),
        // so disable CSRF protection for this MVP dev server.
        enableCsrf: false,
    });
    const logger = new common_1.Logger('Bootstrap');
    const host = process.env.SERVER_HOST || 'localhost';
    const port = Number(process.env.SERVER_PORT || '3000');
    // 注册视图引擎, 渲染 client 目录下的 html 文件
    app.setBaseViewsDir((0, path_1.join)(process.cwd(), 'dist/client'));
    app.setViewEngine('html');
    app.engine('html', hbs_1.__express);
    await app.listen(port, host);
    logger.log(`Server running on ${host}:${port}`);
    logger.log(`API endpoints ready at http://${host}:${port}/api`);
}
bootstrap();

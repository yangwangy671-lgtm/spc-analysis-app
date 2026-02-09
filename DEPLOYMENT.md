# SPC分析系统 - Vercel部署指南

## 🌐 方案一：通过 Vercel 网站部署（最简单）

### 步骤1：推送到 GitHub

1. **创建 GitHub 仓库**
   - 访问 https://github.com/new
   - 仓库名称：`spc-analysis-app`
   - 设置为公开（Public）
   - 不要勾选任何初始化选项
   - 点击"Create repository"

2. **推送代码到 GitHub**
   ```bash
   # 在项目目录运行（D:\AI文件\spc-analysis-app）
   git remote add origin https://github.com/你的用户名/spc-analysis-app.git
   git branch -M main
   git push -u origin main
   ```

### 步骤2：部署到 Vercel

1. **访问 Vercel**
   - 打开 https://vercel.com
   - 点击"Sign Up"或"Login"
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击"New Project"
   - 选择你刚创建的 `spc-analysis-app` 仓库
   - 点击"Import"

3. **配置部署设置**
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

   Vercel会自动检测到这是Vite项目并预填这些配置

4. **开始部署**
   - 点击"Deploy"按钮
   - 等待1-2分钟，部署完成

5. **获取在线地址**
   - 部署成功后，你会看到一个URL，类似：
     `https://spc-analysis-app-xxx.vercel.app`
   - 这就是你的在线SPC分析系统地址！

---

## 🚀 方案二：使用 Vercel CLI（命令行）

### 安装 Vercel CLI
```bash
npm install -g vercel
```

### 部署步骤
```bash
# 1. 登录 Vercel
vercel login

# 2. 部署项目
cd "D:\AI文件\spc-analysis-app"
vercel

# 按照提示操作：
# - Set up and deploy? Y
# - Which scope? 选择你的账号
# - Link to existing project? N
# - Project name? spc-analysis-app
# - Directory? ./
# - Override settings? N

# 3. 生产部署（可选）
vercel --prod
```

---

## 🔧 部署配置文件

已在项目根目录创建 `vercel.json`（可选），内容：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## ✅ 部署后验证

1. **访问你的URL**
   - 打开 Vercel 提供的网址
   - 应该看到SPC分析系统的欢迎页面

2. **测试功能**
   - 上传测试数据（使用 public/sample-data.csv）
   - 查看控制图和分析结果
   - 导出报告

3. **分享给他人**
   - 将URL发送给需要使用的人
   - 他们可以直接在浏览器访问，无需安装

---

## 🎨 自定义域名（可选）

1. 进入 Vercel 项目设置
2. 点击 "Domains"
3. 添加你自己的域名（如：spc.yourdomain.com）
4. 按照提示配置DNS
5. 等待生效（通常几分钟到几小时）

---

## 🔄 后续更新

每次你修改代码并push到GitHub后，Vercel会自动重新部署：

```bash
git add .
git commit -m "更新功能"
git push
```

等待1-2分钟，改动就会自动生效！

---

## 📱 移动端访问

Vercel部署的应用自动支持移动端，用手机浏览器打开URL即可使用。

---

## 💡 常见问题

**Q: 部署失败怎么办？**
A: 检查 Vercel 的构建日志，通常是依赖安装或构建命令的问题。

**Q: 能否私有部署？**
A: 可以，将GitHub仓库设为私有即可，Vercel仍然能访问。

**Q: 流量限制？**
A: Vercel免费版每月100GB流量，对个人使用足够。

**Q: 数据存储在哪？**
A: 所有数据都在用户浏览器本地处理，不会上传到服务器。

---

## 🎉 完成！

恭喜！你的SPC分析系统现在已经在线可用，任何人都可以通过URL访问使用！

---

**技术支持**：如有问题，请检查 Vercel 文档或GitHub Issues

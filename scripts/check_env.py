import sys
import os
import subprocess

def check_python():
    print("检查 Python 版本...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print(f"  ❌ Python 版本过低: {sys.version}")
        print(f"  请安装 Python 3.10+")
        return False
    print(f"  ✅ Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_pip_packages():
    print("\n检查 Python 依赖...")
    required = {
        'python-docx': 'docx',
        'numpy': 'numpy',
        'openai': 'openai',
        'lxml': 'lxml',
        'fonttools': 'fontTools',
    }
    missing = []
    for pkg_name, import_name in required.items():
        try:
            __import__(import_name)
            print(f"  ✅ {pkg_name}")
        except ImportError:
            print(f"  ❌ {pkg_name} 未安装")
            missing.append(pkg_name)

    if missing:
        print(f"\n缺少依赖，正在安装: {', '.join(missing)}")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install'] + missing)
            print("  ✅ 依赖安装完成")
            return True
        except subprocess.CalledProcessError:
            print("  ❌ 自动安装失败，请手动运行:")
            print(f"     pip install {' '.join(missing)}")
            return False
    return True

def check_chinese_fonts():
    print("\n检查中文字体...")
    fonts_dir = r'C:\Windows\Fonts'
    chinese_fonts = ['simhei.ttf', 'msyh.ttc', 'simsun.ttc']
    found = False
    if os.path.exists(fonts_dir):
        for font in chinese_fonts:
            if os.path.exists(os.path.join(fonts_dir, font)):
                print(f"  ✅ {font}")
                found = True
    if not found:
        print("  ⚠️ 未找到中文字体文件，中文可能显示为方块")
        print("  建议安装黑体(simhei.ttf)或微软雅黑(msyh.ttc)")
    return True

def check_node():
    print("\n检查 Node.js...")
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        print(f"  ✅ Node.js {result.stdout.strip()}")
        return True
    except FileNotFoundError:
        print("  ❌ Node.js 未安装")
        print("  下载地址: https://nodejs.org/")
        return False

def main():
    print("=" * 50)
    print("  AI 写字机器人 - 环境检查")
    print("=" * 50)

    results = []
    results.append(check_python())
    results.append(check_pip_packages())
    results.append(check_chinese_fonts())
    results.append(check_node())

    print("\n" + "=" * 50)
    if all(results):
        print("  ✅ 环境检查通过，可以启动应用！")
        print("\n  启动方式:")
        print("    开发模式: npm run electron:dev")
        print("    打包构建: npm run electron:build:win")
    else:
        print("  ⚠️ 部分检查未通过，请根据提示修复")
    print("=" * 50)

if __name__ == '__main__':
    main()

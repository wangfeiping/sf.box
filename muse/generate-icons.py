#!/usr/bin/env python3
"""
Muse 图标生成脚本
使用 PIL/Pillow 库生成不同尺寸的图标
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("需要安装 Pillow 库: pip install Pillow")
    exit(1)

import os

def create_icon(size):
    """创建指定尺寸的图标"""
    # 创建图像
    img = Image.new('RGB', (size, size), color='#4A90E2')
    draw = ImageDraw.Draw(img)

    # 绘制字母 M
    try:
        # 尝试使用系统字体
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size * 0.6))
    except:
        # 如果失败，使用默认字体
        font = ImageFont.load_default()

    text = "M"

    # 计算文本位置（居中）
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    position = ((size - text_width) // 2, (size - text_height) // 2 - bbox[1])

    # 绘制文本
    draw.text(position, text, fill='white', font=font)

    return img

def main():
    """主函数"""
    sizes = [16, 48, 128]
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')

    # 确保 icons 目录存在
    os.makedirs(icons_dir, exist_ok=True)

    for size in sizes:
        print(f"生成 icon{size}.png ...")
        icon = create_icon(size)
        icon.save(os.path.join(icons_dir, f'icon{size}.png'))

    print("所有图标生成完成！")

if __name__ == '__main__':
    main()

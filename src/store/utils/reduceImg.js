/**
 * Created by yakima on 2017/9/30.
 */
//import mode from '@/scripts/mode.js'
// 配置参数
var mode = {
    mode: 1
}
const config = {
    // 不触发压缩行为的最大文件大小（100 * 1024表示100kb），注意，这并不代表压缩后一定会压缩到该大小以下
    maxSize: 100 * 1024
}

/**
 * 获取文件大小描述
 * @param fileSize
 * @returns {string} 如8.1M, 100kb
 */
function getFileSizeDesc(fileSize) {
    return fileSize / 1024 > 1024 ?
        (~~(10 * fileSize / 1024 / 1024) / 10) + 'MB' :
        ~~(fileSize / 1024) + 'kb'
}

function compress(objImg) {
    const d = window.document

    // 用于压缩图片的canvas
    const canvas = d.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // 瓦片canvas
    const tileCanvas = d.createElement('canvas')
    const tileCtx = tileCanvas.getContext('2d')

    // document.getElementsByTagName('body')[0].innerHTML = `<img src="${objImg.src}">`

    const initSize = objImg.src.length
    let width = objImg.width
    let height = objImg.height

    // 如果图片尺寸大于400万像素，计算压缩比并将大小压至400万以下
    let ratio
    if ((ratio = width * height / 4000000) > 1) {
        ratio = Math.sqrt(ratio)
        width /= ratio
        height /= ratio
    } else {
        ratio = 1
    }

    canvas.width = width
    canvas.height = height

    // 铺底色
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 如果图片尺寸大于100万像素则使用瓦片绘制
    let count
    if ((count = width * height / 1000000) > 1) {
        // 计算要分成多少块瓦片
        count = ~~(Math.sqrt(count) + 1)
        const tileWidth = ~~(width / count)
        const tileHeight = ~~(height / count)

        tileCanvas.width = tileWidth
        tileCanvas.height = tileHeight

        for (let i = 0; i < count; i++) {
            for (let j = 0; j < count; j++) {
                tileCtx.drawImage(objImg, i * tileWidth * ratio, j * tileHeight * ratio, tileWidth * ratio, tileHeight * ratio, 0, 0, tileWidth, tileHeight)

                ctx.drawImage(tileCanvas, i * tileWidth, j * tileHeight, tileWidth, tileHeight)
            }
        }
    } else {
        ctx.drawImage(objImg, 0, 0, width, height)
    }

    // 进行最小压缩
    const nData = canvas.toDataURL('image/jpeg', 0.9)
    console.log(nData)
    if (mode.mode !== 0) {
        console.log('压缩前base64数据长度：' + getFileSizeDesc(initSize))
        console.log('压缩后base64数据长度：' + getFileSizeDesc(nData.length))
        console.log('base64数据压缩率：' + ~~(100 * (initSize - nData.length) / initSize) + '%')
    }

    tileCanvas.width = tileCanvas.height = canvas.width = canvas.height = 0
        // document.getElementsByTagName('body')[0].innerHTML = `<img src="${nData}">`
    return nData
}

// 获取blob对象的兼容性写法
function getBlob(buffer, format) {
    let blob
    try {
        blob = new window.Blob(buffer, { type: format })
    } catch (e) {
        const blobBuilder = new(window.BlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder)()
        buffer.forEach(function(buf) {
            blobBuilder.append(buf)
        })
        blob = blobBuilder.getBlob(format)
    }
    if (mode.mode !== 0) {
        console.log(`压缩后Blob对象大小：${getFileSizeDesc(blob.size)}`)
    }
    return blob
}

function getBlobFromBase64Data(base64Data, fileType) {
    // 去除mime type，atob() 函数用来解码一个已经被base-64编码过的数据
    // 需要被频繁处理时，数组好像比字符串性能好点？
    const text = window.atob(base64Data.split(',')[1]).split('')
    const buffer = new window.Uint8Array(text.length)

    for (let i = 0, len = text.length; i < len; i++) {
        buffer[i] = text[i].charCodeAt(0)
    }

    return getBlob([buffer], fileType)
}

/**
 * 压缩图片，返回blob对象
 * 因为是异步操作，需要通过回调函数的方式取用数据
 * @param file
 */
export function compressImage(file) {
    return new Promise((resolve, reject) => {
        const { maxSize } = config

        const reader = new window.FileReader()
        const fileSize = file.size / 1024 > 1024 ?
            (~~(10 * file.size / 1024 / 1024) / 10) + 'MB' :
            ~~(file.size / 1024) + 'kb'
        if (mode.mode !== 0) {
            console.log(`原始Blob对象大小：${fileSize}`)
        }

        reader.onload = function() {
            const result = this.result
            let img = new window.Image()
            img.src = result

            // 若图片小于指定大小，直接返回图片blob
            if (result.length <= maxSize) {
                img = null
                if (mode.mode !== 0) {
                    console.log('图片较小，不需要压缩')
                }
                resolve(getBlobFromBase64Data(result, file.type))
                return
            }
            // 若图片较大，则先压缩再返回压缩后的图片blob
            if (img.complete) {
                callback()
            } else {
                img.onload = callback
            }

            function callback() {
                const data = compress(img)
                    // resolve(data)
                img = null
                resolve(getBlobFromBase64Data(data, file.type))
            }
        }

        reader.readAsDataURL(file)
    })
}
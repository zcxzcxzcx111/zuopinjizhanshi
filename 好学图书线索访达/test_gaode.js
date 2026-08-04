const GAODE_API_KEY = 'b73cf4591428a28097d2c0cf90d69b26';
const url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent('艾宾浩斯')}&city=${encodeURIComponent('巨野县')}&output=json&key=${GAODE_API_KEY}`;

async function testGaode() {
  console.log(`🗺️ 正在调用高德地图底层 POI API 测试 Key 连通性...`);
  console.log(`查询关键词: [艾宾浩斯] · 城市: [巨野县]`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`\n================= 高德地图 API 返回结果 =================`);
    console.log(`状态码 (status): ${data.status} (1代表成功)`);
    console.log(`返回信息 (info): ${data.info}`);
    console.log(`搜索到的 POI 门店数量: ${data.pois ? data.pois.length : 0}`);
    if (data.pois && data.pois.length > 0) {
      data.pois.forEach((poi, index) => {
        console.log(`\n🏠 【门店 ${index + 1}】：${poi.name}`);
        console.log(`📍 详细门牌: ${poi.address || '暂无门牌'}`);
        console.log(`📞 备案联系热线: ${poi.tel || '暂无固话手机'}`);
        console.log(`📍 经纬度坐标: ${poi.location}`);
      });
    }
    console.log(`=========================================================\n`);
  } catch (err) {
    console.error(`❌ 请求高德接口异常: ${err.message}`);
  }
}

testGaode();

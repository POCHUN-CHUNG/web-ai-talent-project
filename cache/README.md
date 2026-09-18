# cache（Redis）

此資料夾對應 `docker-compose.yml` 中的 `redis` 服務（image: `redis:8-trixie`）。

Redis 純作快取用途，未設定本地資料掛載；容器重啟後快取資料會清空，屬預期行為。連線密碼由專案根目錄的 `.env` 的 `REDIS_PASSWORD` 提供。

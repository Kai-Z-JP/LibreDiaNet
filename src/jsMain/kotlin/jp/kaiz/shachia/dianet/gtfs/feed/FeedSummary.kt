package jp.kaiz.shachia.dianet.gtfs.feed

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable


/**
 * APIレスポンス全体を表すデータクラス
 */
@Serializable
data class GTFSFileResponse(
    /** HTTPステータスコード */
    val code: Int,
    /** APIのレスポンスステータスに関するメッセージ */
    val message: String,
    /** データのリスト */
    val body: List<GTFSFeedItem>
)

/**
 * データの各項目を表すデータクラス
 */
@Serializable
data class GTFSFeedItem(
    /** ユニークな事業者の英語名 */
    @SerialName("organization_id")
    val organizationId: String,
    /** 事業者の表示名 */
    @SerialName("organization_name")
    val organizationName: String,
    /** 組織のWebページ */
    @SerialName("organization_web_url")
    val organizationWebUrl: String,
    /** 組織の問い合わせ先EMAIL */
    @SerialName("organization_email")
    val organizationEmail: String,
    /** 事業者でユニークなGTFSフィードの英語名 */
    @SerialName("feed_id")
    val feedId: String,
    /** GTFSフィードの表示名 */
    @SerialName("feed_name")
    val feedName: String,
    /** フィードの都道府県コード */
    @SerialName("feed_pref_id")
    val feedPrefId: Int,
    /** GTFSのライセンス */
    @SerialName("feed_license_id")
    val feedLicenseId: String,
    /** ライセンスに関するURL */
    @SerialName("feed_license_url")
    val feedLicenseUrl: String,
    /** フィードのメタデータURL */
    @SerialName("feed_url")
    val feedUrl: String,
    /** GTFS Data Repositoryのフィード詳細ページのURL */
    @SerialName("feed_page_url")
    val feedPageUrl: String,
    /** ファイルのユニークなID */
    @SerialName("file_uid")
    val fileUid: String,
    /**
     * ファイルの現在を基準とした世代を表すID
     * 現在有効なファイルのridはcurrent
     * 現在未実装で常に"not_implemented_yet"が返却される
     * 1つ前がprev_1、2つ前がprev_2、1つ先がnext_1、2つ先がnext_2
     */
    @SerialName("file_rid")
    val fileRid: String,
    /** ファイルの有効期限開始日 */
    @SerialName("file_from_date")
    val fileFromDate: String,
    /** ファイルの有効期限終了日 */
    @SerialName("file_to_date")
    val fileToDate: String,
    /** GTFSファイルダウンロードURL */
    @SerialName("file_url")
    val fileUrl: String,
    /** GTFSファイルに含まれるバス停の位置情報geojson */
    @SerialName("file_stop_url")
    val fileStopUrl: String?,
    /** GTFSファイルに含まれるルートの位置情報geojson */
    @SerialName("file_route_url")
    val fileRouteUrl: String?,
    /** バスの動きデータ */
    @SerialName("file_tracking_url")
    val fileTrackingUrl: String?,
    /** ファイルの最終更新日時 */
    @SerialName("file_last_updated_at")
    val fileLastUpdatedAt: String,
    /** ファイルの公開日 */
    @SerialName("file_published_at")
    val filePublishedAt: String
)

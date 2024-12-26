use sha2::{Sha256, Digest};

pub fn hash_vec_to_string(data: &Vec<u8>) -> String {
    let mut hasher = Sha256::new();
    
    // データをハッシュ計算
    hasher.update(data);
    
    // ファイナライズ
    let result = hasher.finalize();
    
    // Stringに変換
    format!("{:x}", result)
}

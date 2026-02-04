#!/usr/bin/env python3
"""
만세력 SQL 데이터를 JavaScript JSON으로 변환하는 스크립트
"""

import re
import json
from pathlib import Path

def parse_values(values_str):
    """VALUES 문자열을 파싱하여 리스트로 변환"""
    values = []
    current = ""
    in_quotes = False
    
    for char in values_str:
        if char == "'" and (len(current) == 0 or current[-1] != '\\'):
            in_quotes = not in_quotes
            current += char
        elif char == ',' and not in_quotes:
            values.append(current.strip())
            current = ""
        else:
            current += char
    if current:
        values.append(current.strip())
    
    # 값 정리
    cleaned = []
    for v in values:
        v = v.strip()
        if v == 'NULL' or v == "'NULL'" or v == '':
            cleaned.append(None)
        elif v.startswith("'") and v.endswith("'"):
            cleaned.append(v[1:-1])
        else:
            try:
                cleaned.append(int(v))
            except ValueError:
                cleaned.append(v)
    
    return cleaned

def convert_sql_to_json(sql_path, output_path):
    """SQL 파일을 읽어서 JSON으로 변환"""
    
    data = {}  # { "YYYYMMDD": {...} }
    processed = 0
    errors = 0
    
    with open(sql_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            line = line.strip()
            if 'INSERT INTO calenda_data VALUES' not in line:
                continue
            
            # VALUES (...) 추출
            match = re.search(r'VALUES\s*\((.*)\);?$', line)
            if not match:
                errors += 1
                continue
            
            values = parse_values(match.group(1))
            
            if len(values) < 29:
                errors += 1
                continue
            
            # 필드 인덱스 (SQL 컬럼 순서)
            # 0: cd_no, 1: cd_sgi, 2: cd_sy, 3: cd_sm, 4: cd_sd
            # 5: cd_ly, 6: cd_lm, 7: cd_ld
            # 8: cd_hyganjee (년주 한자), 9: cd_kyganjee (년주 한글)
            # 10: cd_hmganjee (월주 한자), 11: cd_kmganjee (월주 한글)
            # 12: cd_hdganjee (일주 한자), 13: cd_kdganjee (일주 한글)
            # 28: cd_leap_month
            
            sy = values[2]  # 양력 연
            sm = values[3]  # 양력 월
            sd = values[4]  # 양력 일
            
            # 날짜 키 생성
            year = str(sy)
            month = str(sm).zfill(2)
            day = str(sd).zfill(2)
            date_key = f"{year}{month}{day}"
            
            # 데이터 저장 (최소화)
            data[date_key] = {
                "y": values[8],     # 년주 한자
                "yk": values[9],    # 년주 한글
                "m": values[10],    # 월주 한자
                "mk": values[11],   # 월주 한글
                "d": values[12],    # 일주 한자
                "dk": values[13],   # 일주 한글
                "ly": values[5],    # 음력 연
                "lm": values[6],    # 음력 월
                "ld": values[7],    # 음력 일
                "leap": values[28] if len(values) > 28 and values[28] else 0
            }
            
            processed += 1
            if processed % 10000 == 0:
                print(f"Processed {processed} records...")
    
    print(f"\nTotal records: {processed}")
    print(f"Errors: {errors}")
    
    # JSON 파일로 저장
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    
    print(f"Saved to {output_path}")
    
    # 파일 크기 확인
    size = Path(output_path).stat().st_size
    print(f"File size: {size / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    sql_path = "/Users/kangheehan/Library/CloudStorage/GoogleDrive-whitesnowsea@gmail.com/내 드라이브/만세력.sql"
    output_path = "/Users/kangheehan/.gemini/antigravity/scratch/saju_website/manseryeok_data.json"
    
    convert_sql_to_json(sql_path, output_path)

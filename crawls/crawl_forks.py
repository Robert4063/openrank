"""
Fork数据爬虫脚本
使用GitHub API爬取top300项目每天的fork数量
功能:
- 断点续传支持（续传时删除最后一页数据重新爬取，确保不重复不遗漏）
- 多Token轮换
- 获取每个项目的forks及其fork时间
- 按日期统计每天的fork数量
- 数据存储到 data/fork/ 目录
"""
import os
import json
import time
import sys
from datetime import datetime, timezone
from collections import defaultdict
import requests
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
TOKENS = [
    os.getenv("GITHUB_TOKEN_1", "your_github_token_1"),
    os.getenv("GITHUB_TOKEN_2", "your_github_token_2"),
    os.getenv("GITHUB_TOKEN_3", "your_github_token_3"),
    os.getenv("GITHUB_TOKEN_4", "your_github_token_4"),
]
PROJECT_LIST_FILE = "top300_projects_list.txt"
DATA_DIR = "data"
FORK_DIR = os.path.join(DATA_DIR, "fork")
CHECKPOINT_DIR = os.path.join(DATA_DIR, "fork_checkpoint")

START_DATE = datetime(2022,3,1,tzinfo=timezone.utc)
END_DATE = datetime(2023,3,31,23,59,59, tzinfo=timezone.utc)

class GitHubCrawler:
    def __init__(self, tokens):
        self.tokens = tokens
        self.current_token_index = 0
        self.session = requests.Session()
        self._update_headers()
    
    def _update_headers(self):
        token = self.tokens[self.current_token_index % len(self.tokens)]
        self.session.headers.update({
            'Authorization': f'Bearer {token}',
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
        })
    
    def switch_token(self):
        self.current_token_index += 1
        self._update_headers()
        print(f"切换到Token {self.current_token_index % len(self.tokens) + 1}")
        return self.current_token_index
    
    def get_rate_limit_info(self):
        url = "https://api.github.com/rate_limit"
        try:
            response = self.session.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                core = data.get('resources', {}).get('core', {})
                return core.get('remaining', 0), core.get('reset', 0)
        except:
            pass
        return 0, 0
    
    def get_with_retry(self, url, params=None, max_retries=3):
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, params=params, timeout=30)
                
                remaining = int(response.headers.get('X-RateLimit-Remaining', 1))
                if remaining == 0:
                    reset_time = int(response.headers.get('X-RateLimit-Reset', 0))
                    wait_time = max(reset_time - time.time(), 0) + 5
                    print(f"\nRate limit达到，切换token...")
                    old_index = self.current_token_index
                    self.switch_token()
                    if self.current_token_index >= old_index + len(self.tokens):
                        print(f"所有token都达到限制，等待 {min(wait_time, 60):.0f} 秒...")
                        time.sleep(min(wait_time, 60))
                    continue
                
                if response.status_code == 200:
                    return response.json(), response.headers
                elif response.status_code == 403:
                    error_msg = response.json().get('message', '')
                    if 'rate limit' in error_msg.lower():
                        print(f"\n403 Rate limit, 切换token...")
                        self.switch_token()
                        continue
                    else:
                        print(f"\n403 Forbidden: {error_msg}")
                        return None, None
                elif response.status_code == 404:
                    return None, None
                elif response.status_code == 422:
                    return None, None
                else:
                    print(f"\nHTTP {response.status_code}: {response.text[:200]}")
                    time.sleep(2)
                    
            except requests.exceptions.RequestException as e:
                print(f"\n请求错误 (尝试 {attempt + 1}/{max_retries}): {e}")
                time.sleep(5)
        
        return None, None

    def get_forks_page(self, owner, repo, page=1, per_page=100):
        url = f"https://api.github.com/repos/{owner}/{repo}/forks"
        params = {'page': page, 'per_page': per_page, 'sort': 'oldest'}
        data, headers = self.get_with_retry(url, params)
        return data, headers


def ensure_dirs():
    if not os.path.exists(FORK_DIR):
        os.makedirs(FORK_DIR)
    if not os.path.exists(CHECKPOINT_DIR):
        os.makedirs(CHECKPOINT_DIR)


def get_projects():
    projects = []
    if not os.path.exists(PROJECT_LIST_FILE):
        print(f"Error: {PROJECT_LIST_FILE} not found.")
        return []
        
    with open(PROJECT_LIST_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: 
                continue
            if '→' in line:
                projects.append(line.split('→')[-1].strip())
            else:
                projects.append(line)
    return projects


def get_safe_name(repo_name):
    return repo_name.replace('/', '_')


def get_checkpoint_path(repo_name):
    safe_name = get_safe_name(repo_name)
    return os.path.join(CHECKPOINT_DIR, f"{safe_name}.json")


def get_output_path(repo_name):
    safe_name = get_safe_name(repo_name)
    return os.path.join(FORK_DIR, f"{safe_name}.json")


def read_checkpoint(repo_name):
    path = get_checkpoint_path(repo_name)
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {
        "last_page": 0, 
        "daily_forks": {}, 
        "page_dates": {},
        "total_forks": 0,
        "completed": False
    }


def write_checkpoint(repo_name, checkpoint_data):
    path = get_checkpoint_path(repo_name)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(checkpoint_data, f, ensure_ascii=False, indent=2)


def remove_page_data(daily_forks, page_dates, page):
    page_key = str(page)
    if page_key in page_dates:
        dates_to_remove = page_dates[page_key]
        for date_str in dates_to_remove:
            if date_str in daily_forks:
                pass
        del page_dates[page_key]
    return daily_forks, page_dates

def save_result(repo_name, daily_forks, total_forks):
    path = get_output_path(repo_name)
    sorted_dates = sorted(daily_forks.keys())
    result = {
        "project": repo_name,
        "total_forks_in_range": sum(daily_forks.values()),
        "total_forks_all_time": total_forks,
        "start_date": START_DATE.strftime("%Y-%m-%d"),
        "end_date": END_DATE.strftime("%Y-%m-%d"),
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "daily_forks": {date: daily_forks[date] for date in sorted_dates}
    }
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)


def process_repo(crawler, repo_name):
    parts = repo_name.split('/')
    if len(parts) != 2:
        print(f"⚠️  跳过无效项目格式: {repo_name}")
        return False
    
    owner, repo = parts
    
    checkpoint = read_checkpoint(repo_name)
    
    if checkpoint.get("completed", False):
        print(f"[{repo_name}] 已完成，跳过")
        return True
    
    last_page = checkpoint.get("last_page", 0)
    
    daily_forks = defaultdict(int)
    
    # 读取 page_data: 记录每一页每天的fork数量
    # 结构: {"page_number": {"date": count, ...}, ...}
    page_data = checkpoint.get("page_data", {})
    total_forks = checkpoint.get("total_forks", 0)
    
    if last_page > 0:
        last_page_key = str(last_page)
        if last_page_key in page_data:
            print(f"[{repo_name}] 断点续传：删除第 {last_page} 页数据并重新爬取...")
            # 计算需要减去的 fork 数量
            removed_count = sum(page_data[last_page_key].values())
            total_forks -= removed_count
            del page_data[last_page_key]
        # 从 last_page 重新开始（而不是 last_page + 1）
        start_page = last_page
    else:
        start_page = 1
    
    # 从已保存的 page_data 重建 daily_forks
    for page_key, date_counts in page_data.items():
        for date_str, count in date_counts.items():
            daily_forks[date_str] += count
    
    print(f"[{repo_name}] 开始爬取，从第 {start_page} 页开始...")
    
    page = start_page
    forks_in_range = sum(daily_forks.values())
    
    pbar = tqdm(desc=f"[{repo_name}]", unit=" pages", initial=start_page - 1)
    
    try:
        while True:
            data, headers = crawler.get_forks_page(owner, repo, page=page, per_page=100)
            
            if data is None or len(data) == 0:
                break
            
            current_page_data = defaultdict(int)
            
            for fork_info in data:
                total_forks += 1
                
                created_at_str = fork_info.get('created_at')
                if not created_at_str:
                    continue
                
                try:
                    created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                except:
                    continue
                
                if START_DATE <= created_at <= END_DATE:
                    date_str = created_at.strftime("%Y-%m-%d")
                    daily_forks[date_str] += 1
                    current_page_data[date_str] += 1
                    forks_in_range += 1
            
            page_data[str(page)] = dict(current_page_data)
            
            pbar.update(1)
            
            link_header = headers.get('Link', '') if headers else ''
            if 'rel="next"' not in link_header:
                break
            
            if page % 10 == 0:
                checkpoint_data = {
                    "last_page": page,
                    "daily_forks": dict(daily_forks),
                    "page_data": page_data,
                    "total_forks": total_forks,
                    "completed": False
                }
                write_checkpoint(repo_name, checkpoint_data)
            
            page += 1
            time.sleep(0.1)
        
        pbar.close()
        
        save_result(repo_name, dict(daily_forks), total_forks)
        
        checkpoint_data = {
            "last_page": page,
            "daily_forks": dict(daily_forks),
            "page_data": page_data,
            "total_forks": total_forks,
            "completed": True
        }
        write_checkpoint(repo_name, checkpoint_data)
        
        print(f"[{repo_name}] 完成! 总fork: {total_forks}, 范围内: {forks_in_range}")
        return True
        
    except KeyboardInterrupt:
        print(f"\n[{repo_name}] 用户中断，保存进度...")
        checkpoint_data = {
            "last_page": page,
            "daily_forks": dict(daily_forks),
            "page_data": page_data,
            "total_forks": total_forks,
            "completed": False
        }
        write_checkpoint(repo_name, checkpoint_data)
        raise
    except Exception as e:
        print(f"\n[{repo_name}] 错误: {e}")
        checkpoint_data = {
            "last_page": page,
            "daily_forks": dict(daily_forks),
            "page_data": page_data,
            "total_forks": total_forks,
            "completed": False
        }
        write_checkpoint(repo_name, checkpoint_data)
        return False

def main():
    print("=" * 60)
    print("🍴 GitHub Fork数据爬虫 (每日统计)")
    print("=" * 60)
    print(f"\n📁 项目列表: {PROJECT_LIST_FILE}")
    print(f"📁 数据目录: {FORK_DIR}")
    print(f"📁 断点目录: {CHECKPOINT_DIR}")
    print(f"🔑 Token数量: {len(TOKENS)}")
    print(f"📅 时间范围: {START_DATE.strftime('%Y-%m-%d')} ~ {END_DATE.strftime('%Y-%m-%d')}")
    print(f"⚠️  断点续传: 自动删除最后一页数据并重新爬取，确保不重复不遗漏")

    ensure_dirs()

    if len(sys.argv) > 1:
        projects = [sys.argv[1]]
    else:
        projects = get_projects()
    
    if not projects:
        print("❌ 未找到项目列表")
        return
    
    print(f"\n📋 找到 {len(projects)} 个项目")

    crawler = GitHubCrawler(TOKENS)

    remaining, reset = crawler.get_rate_limit_info()
    print(f"📊 当前Token剩余请求次数: {remaining}")
    
    print(f"\n🚀 开始爬取...\n")
    
    success_count = 0
    error_count = 0
    skipped_count = 0
    
    for i, repo_name in enumerate(projects):
        print(f"\n[{i+1}/{len(projects)}] 处理: {repo_name}")

        checkpoint = read_checkpoint(repo_name)
        if checkpoint.get("completed", False):
            print(f"  ✓ 已完成，跳过")
            skipped_count += 1
            continue
        
        try:
            success = process_repo(crawler, repo_name)
            if success:
                success_count += 1
            else:
                error_count += 1
        except KeyboardInterrupt:
            print("\n\n⚠️  用户中断!")
            break
        except Exception as e:
            print(f"  ❌ 错误: {e}")
            error_count += 1
            crawler.switch_token()

    print("\n" + "=" * 60)
    print("📊 爬取统计")
    print("=" * 60)
    print(f"总项目数: {len(projects)}")
    print(f"成功: {success_count}")
    print(f"跳过(已完成): {skipped_count}")
    print(f"失败: {error_count}")
    print("\n✅ 爬取完成!")

if __name__ == "__main__":
    main()

import to from 'await-to-js';
import { StatusCodeError } from 'request-promise-native/errors';
import { ErrorResp } from '../../appApi/base';
import ERROR_CODE, { getErrorCodeMessage } from '../../errorCode';
import Helper from '../utils/helper';
import { Credit, EndPoint, Uris } from '../utils/interfaces';
import Problem from './problem';

class Leetcode {

  session?: string;
  csrfToken: string;

  static uris: Uris;
  static setUris(uris: Uris): void {
    Leetcode.uris = uris;
  }

  constructor (credit: Credit) {
    this.session = credit.session;
    this.csrfToken = credit.csrfToken;
  }

  get credit(): Credit {
    return {
      session: this.session,
      csrfToken: this.csrfToken,
    };
  }

  static async build(username: string, password: string, endpoint: EndPoint): Promise<Leetcode> {
    Helper.switchEndPoint(endpoint);
    const [err, credit] = await to(this.login(username, password)) as any as [Error, Credit];
    if (err) {
      throw new ErrorResp({
        code: (err as ErrorResp).code ?? ERROR_CODE.UNKNOWN_ERROR,
        message: (err as ErrorResp).message ?? getErrorCodeMessage(),
      });
    }

    Helper.setCredit(credit);
    return new Leetcode(credit);
  }

  static async login(username: string, password: string): Promise<Credit> {
    // got login token first
    const [err, response] = await to(Helper.HttpRequest({
      url: Leetcode.uris.login,
      resolveWithFullResponse: true,
    }));
    if (err) {
      throw new ErrorResp({
        code: (err as StatusCodeError).statusCode ?? ERROR_CODE.UNKNOWN_ERROR,
        message: (err as StatusCodeError).message ?? getErrorCodeMessage(),
      });
    }
    const token: string = Helper.parseCookie(response.headers['set-cookie'], 'csrftoken');
    // Leetcode CN returns null here, but it does not matter
    let credit: Credit = {
      csrfToken: token
    };
    Helper.setCredit(credit);

    // then login
    const [e, _response] = await to(Helper.HttpRequest({
      method: 'POST',
      url: Leetcode.uris.login,
      form: {
        csrfmiddlewaretoken: token,
        login: username,
        password: password,
      },
      resolveWithFullResponse: true,
    }));
    if (e) {
      throw new ErrorResp({
        code: (e as StatusCodeError).statusCode ?? ERROR_CODE.UNKNOWN_ERROR,
        message: (e as StatusCodeError).statusCode === 400 ? 'Invalid username or password' : e.message || getErrorCodeMessage(),
      });
    }
    const session = Helper.parseCookie(_response.headers['set-cookie'], 'LEETCODE_SESSION');
    const csrfToken = Helper.parseCookie(_response.headers['set-cookie'], 'csrftoken');
    credit = {
      session: session,
      csrfToken: csrfToken,
    };
    return credit;
  }

  async getProfile(): Promise<any> {
    // ? TODO : fetch more user profile.
    const [err, response]: any = await to(Helper.GraphQLRequest({
      query: `
            {
                user {
                    username
                }
            }
            `
    }));
    if (err) {
      throw new ErrorResp({
        code: (err as StatusCodeError).statusCode ?? ERROR_CODE.UNKNOWN_ERROR,
        message: (err as StatusCodeError).message ?? getErrorCodeMessage(),
      });
    }
    return response.user;
  }

  async getAllProblems(): Promise<Array<Problem>> {
    let [err, response] = await to(Helper.HttpRequest({
      url: Leetcode.uris.problemsAll,
    }));
    if (err) {
      throw new ErrorResp({
        code: (err as StatusCodeError).statusCode ?? ERROR_CODE.UNKNOWN_ERROR,
        message: (err as StatusCodeError).message ?? getErrorCodeMessage(),
      });
    }
    response = JSON.parse(response);
    const problems: Array<Problem> = response.stat_status_pairs.map((p: any) => {
      return new Problem(
        p.stat.question__title_slug,
        p.stat.question_id,
        p.stat.question__title,
        Helper.difficultyMap(p.difficulty.level),
        p.is_favor,
        p.paid_only,
        undefined,
        undefined,
        Helper.statusMap(p.status),
        undefined,
        p.stat.total_acs,
        p.stat.total_submitted,
        undefined,
        undefined,
        undefined
      );
    });
    return problems;
  }

  async getProblemsByTag(tag: string): Promise<Array<Problem>> {
    const response = await Helper.GraphQLRequest({
      query: `
                query getTopicTag($slug: String!) {
                    topicTag(slug: $slug) {
                        questions {
                            status
                            questionId
                            title
                            titleSlug
                            stats
                            difficulty
                            isPaidOnly
                            topicTags {
                                slug
                            }
                        }
                    }
                }
            `,
      variables: {
        slug: tag,
      }
    });
    const problems: Array<Problem> = response.topicTag.questions.map((p: any) => {
      const stat: any = JSON.parse(p.stats);
      return new Problem(
        p.titleSlug,
        p.questionId,
        p.title,
        stat.title,
        undefined,
        p.isPaidOnly,
        undefined,
        undefined,
        Helper.statusMap(p.status),
        p.topicTags.map((t: any) => t.slug),
        stat.totalAcceptedRaw,
        stat.totalSubmissionRaw,
        undefined,
        undefined,
        undefined
      );
    });
    return problems;
  };

}

export default Leetcode;
